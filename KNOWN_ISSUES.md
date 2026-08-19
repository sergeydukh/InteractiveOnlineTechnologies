# Known product issues and characterization gaps

## KNOWN-001: authentication errors are not visible

The login and registration scripts write failed API responses to `console.error` but render no user-facing alert. The UI test asserts the required behaviour and is marked as an expected failure until the product is fixed.

Expected resolution: render the server message in an accessible `role="alert"` region and remove `test.fail`.

## KNOWN-002: profile name limit differs between UI and API

The profile input limits names to 120 characters, while the API currently accepts 121 characters. The API suite records the current response as a tagged characterization rather than pretending the layers agree.

Expected resolution: align the backend validation with the documented UI limit, then change the characterization into a negative contract test.

## Characterization backlog: client analytics endpoints

The assignment mentions `POST /api/analytics/register|login|logout` but does not define their request bodies. Empty-payload calls do not prove a business contract and are intentionally absent. Add typed service methods only after documentation or observation of the real client payload.

## KNOWN-003: unsupported avatar produces a server error

Uploading a non-image file through the profile endpoint returns HTTP `500` instead of a controlled `4xx` validation response. The automated probe was removed from regression because MIME/security probes are outside the agreed test-assignment scope. Valid PNG upload/removal remains covered through UI and API.

Expected resolution: reject unsupported media with a stable client-error status and visible UI feedback, then replace the characterization assertion.

## KNOWN-004: logout does not invalidate the bearer token

`POST /api/auth/logout` returns success and the UI clears local storage, but the same bearer token can still read the profile. The intended invalidation check runs only in the known-defects lane.

Expected resolution: revoke the logged-out token server-side while leaving other active sessions valid, then remove `test.fail`.
