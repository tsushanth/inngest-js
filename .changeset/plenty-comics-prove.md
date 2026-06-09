---
"inngest": minor
---

Add `sessions` to event payloads

Pass `sessions: { name: id }` when sending events (`inngest.send()`, `step.sendEvent()`) to group the runs they trigger into named sessions

`step.invoke()` accepts an explicit `sessions` option, and received events

`step.waitForEvent()` results expose `sessions` as `Record<string, string>`
