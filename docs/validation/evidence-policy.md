# Evidence Commit Policy

## Purpose

Validation evidence exists to **document system behavior at known milestones**, not to track every exploratory run.

This policy defines when evidence should be committed to version control.

---

## Commit Rules

### ✅ Commit Evidence When:
- A validation phase is declared complete
- Results reflect acknowledged failures or confirmed passes
- Evidence is intended to serve as a historical reference

### ❌ Do Not Commit Evidence When:
- Runs are exploratory or iterative
- Failures are still under investigation
- Evidence would be superseded shortly

---

## Immutability

Once committed:
- Evidence files must not be modified
- Corrections require a **new validation run**
- Filenames are treated as immutable identifiers

---

## File Scope

- Only the **final evidence artifact** for a phase should be committed
- Prior exploratory evidence must be discarded

---

## Rationale

This approach:
- Preserves signal clarity
- Avoids repository noise
- Establishes clean validation checkpoints
