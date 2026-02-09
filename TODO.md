# TODO

## Address omitted variable bias when deleting interventions

**Status:** Open

**Context:**

When a user deletes an intervention, the `REMOVE_INTERVENTION` reducer correctly removes the intervention name from `state.interventions` and removes the corresponding boolean from every observation's `interventions` array. This keeps the data structurally consistent.

**The problem:**

The sleep scores from nights when the deleted intervention was active remain in the dataset. If the deleted intervention had a negative effect on sleep, those low scores are still used during Bayesian inference—but the model no longer knows that the deleted intervention was present on those nights.

Consider this scenario:
1. User adds interventions A (good), B (good), and C (bad)
2. Over 10 nights, Thompson Sampling randomly activates combinations of these
3. On nights where C was active, scores are lower due to C's negative effect
4. User notices C seems bad and deletes it
5. The low scores from C-active nights remain, but the `interventions` arrays no longer indicate C was present
6. If A or B happened to co-occur with C on those bad nights (by random chance), the model may incorrectly attribute some of C's negative effect to them

This is a form of omitted variable bias. The model can only reason about interventions it knows about, so it may "blame" the wrong interventions for outcomes caused by a deleted one.

**Potential solutions to investigate:**

- Offer to delete observations where the removed intervention was active (cleanest statistically, but loses data)
- Show a warning about potential confounding, especially if the intervention was frequently active
- Display which observations would be affected before confirming deletion
- Allow "archiving" an intervention: keep it in inference to absorb its effect, but hide it from the UI and exclude it from Thompson Sampling
- Do nothing and document the limitation (simpler, and the effect diminishes as more data is collected without the bad intervention)
