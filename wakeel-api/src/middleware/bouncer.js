/**
 * Bouncer — lightweight authorization gate.
 *
 * Created per-request with the authenticated userId.
 * Controllers use it for declarative permission checks before calling services.
 *
 * Usage:
 *   bouncer.authorize(job.poster_id);          // throws 403 if not owner
 *   bouncer.isOwner(job.poster_id);            // returns boolean
 *   bouncer.authorizeParty([poster, applicant]); // throws if userId not in list
 */
export function createBouncer(userId) {
  return {
    /** The authenticated user's ID. */
    userId,

    /**
     * Check if the current user owns a resource.
     * @param {string} ownerId — the resource owner's ID
     * @returns {boolean}
     */
    isOwner(ownerId) {
      return userId === ownerId;
    },

    /**
     * Require ownership — throws 403 if the user is not the owner.
     * @param {string} ownerId
     * @param {string} [message]
     */
    authorize(ownerId, message) {
      if (userId !== ownerId) {
        const err = new Error(message || 'You are not authorized to perform this action');
        err.status = 403;
        err.code = 'FORBIDDEN';
        throw err;
      }
    },

    /**
     * Require the user to be one of the listed party members.
     * Useful for chat / reviews where both poster and applicant are valid.
     * @param {string[]} partyIds
     * @param {string} [message]
     */
    authorizeParty(partyIds, message) {
      if (!partyIds.includes(userId)) {
        const err = new Error(message || 'You are not a party to this resource');
        err.status = 403;
        err.code = 'FORBIDDEN';
        throw err;
      }
    },

    /**
     * Generic guard — throws 403 if condition is false.
     * @param {boolean} condition
     * @param {string} [message]
     * @param {string} [code]
     */
    check(condition, message, code) {
      if (!condition) {
        const err = new Error(message || 'Forbidden');
        err.status = 403;
        err.code = code || 'FORBIDDEN';
        throw err;
      }
    },
  };
}
