Schema Lock Rules (So “v1” Actually Means Locked)

To treat this as locked:

schema_version stays "1.0" until a breaking change

Breaking change → "2.0" plus migration notes

You may add new optional top-level fields at any time

Consumers must ignore unknown fields

This is the minimum needed to be Marketplace-safe and audit-friendly.

