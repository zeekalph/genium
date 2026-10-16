# Genium

**Verify medicine and food before you use it.**

Snap a photo of a pack. Genium reads the label, checks it against NAFDAC records, looks at what the crowd has reported about that batch, and gives you a plain-language verdict in your own language (English, Yoruba, Hausa, Igbo, Pidgin) with a clear next step.

---

## The problem

Fake and mislabelled medicines, herbals, and packaged foods are a daily risk in Nigeria. Most people can't tell a genuine pack from a fake one.

- NAFDAC's Greenbook registry exists, but it's a manual lookup that almost nobody uses.
- The SMS scratch-code (MAS) scheme only covers some medicines.
- Investigations have found products carrying registration numbers that belong to entirely different products. A counterfeiter takes a valid number from a cheap paracetamol and prints it on a fake Augmentin. "The number exists" is not the same as "this pack is real."

## The solution

1. **Read**: Gemma 4 Vision extracts the NAFDAC number, product name, manufacturer, batch, and dates from the photo, with a confidence score per field.
2. **Verify**: deterministic checks run against a snapshot of the Greenbook. Does the number exist? Does it belong to this product and manufacturer? Are the dates valid? Does the carton batch match the blister batch?
3. **Crowd intelligence**: reports are keyed by product and batch. One suspicious sighting raises the risk for everyone holding that batch.
4. **Explain**: Gemma 4 turns the findings into a faithful, safe explanation in the user's language.
5. **Parse reports**: Gemma 4 turns free-text reports in local languages into structured records for the batch engine, and generates localized training rows into a live dataset.

## The 3-tier verdict

We never say "this is fake." We say what we can and can't verify.

| Verdict   | Meaning                                                                                                                            |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Green** | Registry and batch clear. Label matches NAFDAC records, carton matches blister, no adverse batch reports.                          |
| **Amber** | Unverified or batch alert. Label matches records, but the batch has crowd-reported quality issues or unusual scan activity.        |
| **Red**   | Registry or packaging mismatch. Number doesn't exist, belongs to a different product, or carton and blister contradict each other. |

When we can't tell, we say so and send the user to a pharmacist or NAFDAC. Genium gives no medical advice.

## What about a perfect 1-to-1 clone with bad contents?

A phone camera is not a spectrometer, and we never claim a photo proves chemical purity. We catch clones in four layers:

| Attack                                               | How Genium catches it                                                                         |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Real number stolen onto the wrong product            | Registry cross-check (number vs product vs manufacturer)                                      |
| Cloned carton with a cheap or mismatched blister     | Two-surface photo: carton + blister side by side, compare batch, expiry, and pill appearance  |
| One real batch number copied onto thousands of fakes | Batch velocity and geo-collision anomalies                                                    |
| Perfect visual clone, chalk inside                   | Crowd kill-switch: local-language reports ("chalky", "no effect") flag the batch for everyone |

**Judge Q&A line:** "A counterfeiter can clone ink on cardboard, but they cannot hide a bad batch from a connected crowd."

## Where the sponsors fit

- **Gemma 4**: vision extraction, multilingual explainer, report parser, synthetic data expander.
- **Adaption (Adaptive Data workflow)**: every scan and report generates structured, localized training rows into a live `.jsonl` dataset, ready for AutoScientist fine-tuning. We don't have Adaption access yet, so we mirror the workflow with Gemma 4 and keep the output in a compatible format.
- **DigitalOcean**: hosts the API, the registry snapshot, and dataset storage (Droplet or App Platform, plus Spaces for exports).

## Why it scales

- Every scan and report improves batch intelligence at near-zero marginal cost.
- The same pipeline extends to any NAFDAC-regulated category (drugs, food, cosmetics, herbals).
- New languages only need new seed data, not new code.
- The live dataset becomes a fine-tuning asset for small open-weight models in Nigerian languages.

## Demo (about 2 minutes)

1. **Genuine pack**: snap a real pack, green pass in about 2 seconds.
2. **Cloned registration number**: a mocked "Augmentin" carrying Emzor Paracetamol's NAFDAC number. Red mismatch, verdict read out in Yoruba (then a Pidgin switch for the room reaction).
3. **Crowd climax**: submit a one-sentence Yoruba or Pidgin report on that batch. The hotspot dashboard spikes to High Risk and the dataset drawer fills with new multilingual training rows, live.

End on the dashboard lighting up, not on a benchmark table.

## Team

| Role           | Owner   | Focus                                                                                    |
| -------------- | ------- | ---------------------------------------------------------------------------------------- |
| Frontend       | Nebulaz | Mobile-first scan UI, verdict screen, live dashboard, dataset drawer                     |
| Backend        | _TBD_   | DigitalOcean deploy, scan/report/export API, registry store, batch engine                |
| ML / Data      | _TBD_   | Extraction prompt, explainer prompt, report parser, Greenbook snapshot, dataset expander |
| Product / Demo | _TBD_   | Physical props, demo script, pitch, testing                                              |

## Honest limits (say these before the judges do)

- Photos verify labels and registry consistency, not chemical content.
- Our registry is a curated snapshot of about 50 products for the demo. Production would sync with NAFDAC data.
- Crowd signals need volume to be reliable, and we handle that with thresholds and verified-pharmacist weighting.
