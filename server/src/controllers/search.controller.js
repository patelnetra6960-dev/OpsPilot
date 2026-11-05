import { searchService } from '../services/search.service.js';
import { sendPaginated, sendSuccess } from '../utils/responseHandler.js';
import asyncHandler from '../middleware/asyncHandler.js';

export class SearchController {
  /**
   * Extract standardized user context
   */
  getUserContext(req) {
    return {
      userId: req.user?.id,
      userEmail: req.user?.email,
      userName: req.user?.full_name || req.user?.name,
      role: req.membership?.role || req.userRole || req.user?.role || 'employee',
      customerId: req.customer?.id || req.user?.customer_id
    };
  }

  /**
   * Unified global search across 7 key domain entities
   */
  search = asyncHandler(async (req, res) => {
    const organizationId = req.tenant.id;
    const userContext = this.getUserContext(req);
    const result = await searchService.searchEntities(organizationId, req.query, userContext);
    return sendPaginated(
      res,
      result.data,
      result.pagination,
      'Search results retrieved successfully'
    );
  });

  /**
   * Data export endpoint (CSV or JSON)
   */
  exportData = asyncHandler(async (req, res) => {
    const organizationId = req.tenant.id;
    const userContext = this.getUserContext(req);
    const options = { ...req.query, ...req.body };
    const result = await searchService.exportData(organizationId, options, userContext);

    if (options.format === 'json') {
      return sendSuccess(res, result.data, 'Data exported successfully', 200, {
        totalItems: result.rowCount
      });
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('X-Total-Count', result.rowCount);
    return res.status(200).send(result.csvContent);
  });
}

export const searchController = new SearchController();
