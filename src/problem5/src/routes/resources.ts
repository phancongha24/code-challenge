import {Router, Request, Response} from 'express';
import {DatabaseService} from '../database';
import {CreateResourceInput, UpdateResourceInput, ResourceFilters} from '../types';

const router = Router();
const db = new DatabaseService();

/**
 * @route GET /resources
 * @description Get all resources with optional filters
 * @query category - Filter by category
 * @query status - Filter by status (active|inactive)
 * @query name - Filter by name (partial match)
 * @query limit - Limit number of results
 * @query offset - Offset for pagination
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const filters: ResourceFilters = {
            category: req.query.category as string,
            status: req.query.status as 'active' | 'inactive',
            name: req.query.name as string,
            limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
            offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
        };

        const resources = await db.getResources(filters);
        res.json({
            success: true,
            data: resources,
            count: resources.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch resources',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * @route GET /resources/:id
 * @description Get a specific resource by ID
 * @param id - Resource ID
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const {id} = req.params;
        const resource = await db.getResourceById(id);

        if (!resource) {
            return res.status(404).json({
                success: false,
                error: 'Resource not found'
            });
        }

        res.json({
            success: true,
            data: resource
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch resource',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * @route POST /resources
 * @description Create a new resource
 * @body name - Resource name (required)
 * @body description - Resource description (required)
 * @body category - Resource category (required)
 * @body status - Resource status (optional, defaults to 'active')
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const {name, description, category, status}: CreateResourceInput = req.body;

        if (!name || !description || !category) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: name, description, category'
            });
        }

        if (status && !['active', 'inactive'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Status must be either "active" or "inactive"'
            });
        }

        const resource = await db.createResource({
            name,
            description,
            category,
            status
        });

        res.status(201).json({
            success: true,
            data: resource
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to create resource',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * @route PUT /resources/:id
 * @description Update an existing resource
 * @param id - Resource ID
 * @body name - Resource name (optional)
 * @body description - Resource description (optional)
 * @body category - Resource category (optional)
 * @body status - Resource status (optional)
 */
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const {id} = req.params;
        const updateData: UpdateResourceInput = req.body;

        if (updateData.status && !['active', 'inactive'].includes(updateData.status)) {
            return res.status(400).json({
                success: false,
                error: 'Status must be either "active" or "inactive"'
            });
        }

        const resource = await db.updateResource(id, updateData);

        if (!resource) {
            return res.status(404).json({
                success: false,
                error: 'Resource not found'
            });
        }

        res.json({
            success: true,
            data: resource
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to update resource',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * @route DELETE /resources/:id
 * @description Delete a resource
 * @param id - Resource ID
 */
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const {id} = req.params;
        const deleted = await db.deleteResource(id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Resource not found'
            });
        }

        res.json({
            success: true,
            message: 'Resource deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to delete resource',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router; 