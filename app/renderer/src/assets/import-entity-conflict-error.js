// import-entity-conflict-error.js

export class ImportEntityConflictError extends Error {
  conflict;
  constructor(conflict) {
    super(`Entity ${conflict.existingEntity.name} already exists`);
    this.name = "ImportEntityConflictError";
    this.conflict = conflict;
  }
}
