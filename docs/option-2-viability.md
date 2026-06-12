# Option 2 Viability Spike

This repo ships **option 1** as the production architecture:

- Entra signs the user into FieldOps
- the backend performs a one-time per-user Halo OAuth connect
- the backend stores the encrypted Halo refresh token and uses it for downstream API access

## Goal of the spike

Determine whether Halo can remove the separate `Connect Halo` consent flow and accept a true Entra-native delegated API model.

## Questions to answer

1. Can Halo accept Entra-issued delegated tokens directly for API access?
2. Can Halo perform token exchange or federation from the FieldOps Entra identity to a Halo API identity?
3. Can the Entra identity used by SWA be deterministically mapped to the correct Halo agent without separate user linking?

## Exit criteria

- If all three answers are yes, design a follow-on architecture that removes the stored Halo refresh token model.
- If any answer is no, keep option 1 as the supported production design.

## Evidence to capture

- Halo tenant docs or vendor confirmation
- token acceptance test results
- user-mapping proof for at least one real technician account
- any constraints that would force SWA Standard, custom auth, or a different BFF flow
