// account-scope-equals.js

export function accountScopeEquals(left, right) {
  if (left === right) return true;
  if (!left || !right) return false;
  return (
    left.identityKey === right.identityKey &&
    left.groupId === right.groupId &&
    left.epoch === right.epoch &&
    left.membershipRevision === right.membershipRevision
  );
}
