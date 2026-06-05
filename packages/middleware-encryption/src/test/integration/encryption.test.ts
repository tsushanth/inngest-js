import {
  createState,
  createTestApp,
  randomSuffix,
  testNameFromFileUrl,
} from "@inngest/test-harness";
import { Inngest, Middleware } from "inngest";
import { createDefer } from "inngest/experimental";
import { createServer } from "inngest/node";
import { expect, test } from "vitest";
import { EncryptionService, encryptionMiddleware } from "../../middleware";

const testFileName = testNameFromFileUrl(import.meta.url);

test("encrypts on defer, decrypts on receive", async () => {
  const key = "test-key";
  const deferState = createState({
    data: null as Record<string, unknown> | null,
  });
  const captureState = createState({
    data: null as Record<string, unknown> | null,
  });

  // Capture middleware is listed AFTER the encryption middleware so that
  // forward-order composition lets encryption transform first and capture
  // observes the post-encryption (ciphertext) state.
  class Capture extends Middleware.BaseMiddleware {
    readonly id = "capture";
    override transformDeferInput(
      arg: Middleware.TransformDeferInputArgs,
    ): Middleware.TransformDeferInputArgs {
      captureState.data = arg.defers[0]?.data ?? null;
      return arg;
    }
  }

  const client = new Inngest({
    id: randomSuffix(testFileName),
    isDev: true,
    middleware: [encryptionMiddleware({ key }), Capture],
  });
  const eventName = randomSuffix("evt");
  const foo = createDefer(client, { id: "foo" }, async ({ event, runId }) => {
    deferState.runId = runId;
    deferState.data = event.data;
  });
  const fn = client.createFunction(
    { id: "fn", retries: 0, triggers: { event: eventName } },
    async ({ defer }) => {
      defer("foo", {
        function: foo,
        data: {
          [EncryptionService.DEFAULT_ENCRYPTED_EVENT_FIELD]: {
            secret: "value",
          },
          public_field: "visible",
        },
      });
    },
  );
  await createTestApp({ client, functions: [fn, foo], serve: createServer });

  await client.send({ name: eventName });
  await deferState.waitForRunComplete();

  // Mid-flight: encrypted field is ciphertext, public field is untouched.
  // Without this assertion, the round-trip below would still pass if the
  // encryption middleware silently no-op'd transformDeferInput.
  expect(captureState.data).toMatchObject({
    [EncryptionService.DEFAULT_ENCRYPTED_EVENT_FIELD]: expect.objectContaining({
      [EncryptionService.ENCRYPTION_MARKER]: true,
      data: expect.any(String),
    }),
    public_field: "visible",
  });

  // On receive: child sees plaintext (round-trip success).
  expect(deferState.data).toEqual({
    [EncryptionService.DEFAULT_ENCRYPTED_EVENT_FIELD]: { secret: "value" },
    public_field: "visible",
  });
});
