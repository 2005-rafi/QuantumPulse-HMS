/**
 * ProjectionStrategy
 * Restricts retrieved MongoDB fields to minimize BSON serialization, memory, and payload size.
 *
 * Rules from docs/file.md:
 * - List endpoints should retrieve only fields necessary for listing rather than full documents.
 * - Allowed projections are defined in DomainQueryConfig.
 */
class ProjectionStrategy {
  /**
   * Builds MongoDB projection object.
   * @param {string[]|null} requestedFields - Fields requested by client/service
   * @param {object} projectionConfig - Domain projection configuration
   * @returns {object|null} MongoDB projection object (e.g. { mrn: 1, firstName: 1, ... })
   */
  static build(requestedFields, projectionConfig = {}) {
    // 1. If predefined profile requested (e.g. 'list', 'summary', 'minimal')
    if (typeof requestedFields === 'string' && projectionConfig.profiles && projectionConfig.profiles[requestedFields]) {
      return { ...projectionConfig.profiles[requestedFields] };
    }

    // 2. If explicit fields array provided
    if (Array.isArray(requestedFields) && requestedFields.length > 0) {
      const allowed = projectionConfig.allowedFields || [];
      const proj = { _id: 1 };
      for (const f of requestedFields) {
        if (allowed.length === 0 || allowed.includes(f)) {
          proj[f] = 1;
        }
      }
      return proj;
    }

    // 3. Fallback to default list projection if defined
    if (projectionConfig.defaultProjection) {
      return { ...projectionConfig.defaultProjection };
    }

    return null;
  }
}

module.exports = ProjectionStrategy;
