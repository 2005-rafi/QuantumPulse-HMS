const SearchStrategy = require('./strategies/SearchStrategy');
const FilterStrategy = require('./strategies/FilterStrategy');
const SortStrategy = require('./strategies/SortStrategy');
const PaginationStrategy = require('./strategies/PaginationStrategy');
const ProjectionStrategy = require('./strategies/ProjectionStrategy');
const QueryContext = require('./QueryContext');

/**
 * QueryBuilder
 * Orchestrates pluggable strategies with domain configuration to compile and execute optimized queries.
 *
 * Architecture:
 * - QueryContext (Normalized inputs) + DomainQueryConfig (Domain rules)
 *     -> SearchStrategy + FilterStrategy + SortStrategy + PaginationStrategy + ProjectionStrategy
 *     -> Compiled MongoDB Query Descriptor
 */
class QueryBuilder {
  /**
   * Compiles an executable database query descriptor from context and domain config.
   * @param {QueryContext} context
   * @param {object} config - DomainQueryConfig instance or schema
   * @returns {object} Compiled query descriptor
   */
  static compile(context, config) {
    if (!(context instanceof QueryContext)) {
      context = new QueryContext(context);
    }

    // 1. Build Filter Predicates (User filters + Server security scope)
    const baseFilter = FilterStrategy.build(context.filters, context.securityScope, config.filters || {});

    // 2. Build Search Predicates
    const searchFilter = SearchStrategy.build(context.q, config.search || {});

    // 3. Combine Filter & Search with $and if both exist
    let finalFilter = baseFilter;
    if (searchFilter) {
      if (Object.keys(baseFilter).length > 0) {
        finalFilter = { $and: [baseFilter, searchFilter] };
      } else {
        finalFilter = searchFilter;
      }
    }

    // 4. Build Sort Descriptor (Deterministic with unique tie-breaker)
    const sort = SortStrategy.build(context.sortBy, context.sortOrder, config.sort || {});

    // 5. Build Projection
    const projection = ProjectionStrategy.build(context.fields, config.projection || {});

    // 6. Build Pagination (Cursor keyset or Offset)
    const isCursor = Boolean(context.cursor);
    let cursorFilter = null;
    let pagination = {};

    if (isCursor) {
      cursorFilter = PaginationStrategy.buildCursorFilter(context.cursor, sort);
      if (cursorFilter) {
        if (finalFilter.$and) {
          finalFilter.$and.push(cursorFilter);
        } else if (Object.keys(finalFilter).length > 0) {
          finalFilter = { $and: [finalFilter, cursorFilter] };
        } else {
          finalFilter = cursorFilter;
        }
      }
      pagination = { limit: context.limit + 1 }; // fetch limit + 1 to check for next page
    } else {
      pagination = PaginationStrategy.buildOffset(context.page, context.limit);
    }

    const sortField = Object.keys(sort)[0] || 'createdAt';

    return {
      filter: finalFilter,
      sort,
      projection,
      pagination,
      isCursor,
      sortField,
      page: context.page,
      limit: context.limit,
    };
  }

  /**
   * Executes the compiled query against a Mongoose model with automatic pagination metadata.
   * @param {mongoose.Model} Model - Target Mongoose model
   * @param {QueryContext|object} queryContext - Sanitized QueryContext or raw params
   * @param {object} config - DomainQueryConfig
   * @param {object} options - Optional execution overrides (populate, lean, etc.)
   * @returns {Promise<{ items: Array, total?: number, page?: number, limit: number, pages?: number, nextCursor?: string|null, hasNextPage: boolean }>}
   */
  static async execute(Model, queryContext, config, options = {}) {
    const compiled = this.compile(queryContext, config);

    let query = Model.find(compiled.filter);

    if (compiled.projection) {
      query = query.select(compiled.projection);
    }

    if (compiled.sort) {
      query = query.sort(compiled.sort);
    }

    if (options.populate) {
      const populates = Array.isArray(options.populate) ? options.populate : [options.populate];
      for (const p of populates) {
        query = query.populate(p);
      }
    }

    if (compiled.isCursor) {
      query = query.limit(compiled.pagination.limit);
    } else {
      query = query.skip(compiled.pagination.skip).limit(compiled.pagination.limit);
    }

    if (options.lean !== false) {
      query = query.lean();
    }

    if (compiled.isCursor) {
      const rawItems = await query.exec();
      const hasNextPage = rawItems.length > compiled.limit;
      const items = hasNextPage ? rawItems.slice(0, compiled.limit) : rawItems;
      const lastItem = items.length > 0 ? items[items.length - 1] : null;
      const nextCursor = hasNextPage && lastItem ? PaginationStrategy.encodeCursor(lastItem, compiled.sortField) : null;

      return {
        items,
        limit: compiled.limit,
        nextCursor,
        hasNextPage,
      };
    } else {
      const [items, total] = await Promise.all([
        query.exec(),
        options.skipCount ? Promise.resolve(null) : Model.countDocuments(compiled.filter),
      ]);

      const pages = total !== null ? Math.ceil(total / compiled.limit) : null;
      const hasNextPage = total !== null ? compiled.page < pages : items.length === compiled.limit;

      return {
        items,
        total: total !== null ? total : items.length,
        totalItems: total !== null ? total : items.length,
        page: compiled.page,
        limit: compiled.limit,
        pages: pages !== null ? pages : 1,
        totalPages: pages !== null ? pages : 1,
        hasNextPage,
      };
    }
  }
}

module.exports = QueryBuilder;
