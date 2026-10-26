/**
 * DomainQueryConfig
 * Abstract base class for domain query configurations.
 *
 * SOLID Principles:
 * - OCP: New fields or strategy tweaks are added in domain configs without changing core query execution.
 * - SRP: Exclusively owns the schema mapping and allowed rules for one entity domain.
 */
class DomainQueryConfig {
  constructor({
    search = {},
    filters = {},
    sort = {},
    projection = {},
  } = {}) {
    this.search = {
      exactFields: [],
      prefixFields: [],
      protectedFields: [],
      containsFields: [],
      ...search,
    };

    this.filters = {
      allowedFields: {},
      dateRanges: {},
      ...filters,
    };

    this.sort = {
      allowedFields: {},
      shortcuts: {},
      defaultSort: { createdAt: -1, _id: -1 },
      ...sort,
    };

    this.projection = {
      allowedFields: [],
      profiles: {},
      defaultProjection: null,
      ...projection,
    };

    Object.freeze(this);
  }
}

module.exports = DomainQueryConfig;
