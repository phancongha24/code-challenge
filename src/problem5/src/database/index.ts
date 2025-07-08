import sqlite3 from 'sqlite3';
import {v4 as uuidv4} from 'uuid';
import {Resource, CreateResourceInput, UpdateResourceInput, ResourceFilters} from '../types';

/**
 * Database service for managing resources using SQLite
 */
export class DatabaseService {
    private db: sqlite3.Database;

    constructor(dbPath: string = './resources.db') {
        this.db = new sqlite3.Database(dbPath);
        this.initializeDatabase();
    }

    /**
     * Initialize database tables
     */
    private initializeDatabase(): void {
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS resources
            (
                id
                TEXT
                PRIMARY
                KEY,
                name
                TEXT
                NOT
                NULL,
                description
                TEXT
                NOT
                NULL,
                category
                TEXT
                NOT
                NULL,
                status
                TEXT
                NOT
                NULL
                CHECK (
                status
                IN
            (
                'active',
                'inactive'
            )),
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
                )
        `;

        this.db.run(createTableSQL, (err: Error | null) => {
            if (err) {
                console.error('Error creating table:', err);
            } else {
                console.log('Database initialized successfully');
            }
        });
    }

    /**
     * Create a new resource
     */
    async createResource(input: CreateResourceInput): Promise<Resource> {
        return new Promise((resolve, reject) => {
            const resource: Resource = {
                id: uuidv4(),
                name: input.name,
                description: input.description,
                category: input.category,
                status: input.status || 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const sql = `
                INSERT INTO resources (id, name, description, category, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;

            this.db.run(sql, [
                resource.id,
                resource.name,
                resource.description,
                resource.category,
                resource.status,
                resource.created_at,
                resource.updated_at
            ], function (err: Error | null) {
                if (err) {
                    reject(err);
                } else {
                    resolve(resource);
                }
            });
        });
    }

    /**
     * Get all resources with optional filters
     */
    async getResources(filters: ResourceFilters = {}): Promise<Resource[]> {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT * FROM resources WHERE 1=1';
            const params: any[] = [];

            if (filters.category) {
                sql += ' AND category = ?';
                params.push(filters.category);
            }

            if (filters.status) {
                sql += ' AND status = ?';
                params.push(filters.status);
            }

            if (filters.name) {
                sql += ' AND name LIKE ?';
                params.push(`%${filters.name}%`);
            }

            sql += ' ORDER BY created_at DESC';

            if (filters.limit) {
                sql += ' LIMIT ?';
                params.push(filters.limit);
            }

            if (filters.offset) {
                sql += ' OFFSET ?';
                params.push(filters.offset);
            }

            this.db.all(sql, params, (err: Error | null, rows: any[]) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows as Resource[]);
                }
            });
        });
    }

    /**
     * Get a single resource by ID
     */
    async getResourceById(id: string): Promise<Resource | null> {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM resources WHERE id = ?';

            this.db.get(sql, [id], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row as Resource || null);
                }
            });
        });
    }

    /**
     * Update an existing resource
     */
    async updateResource(id: string, input: UpdateResourceInput): Promise<Resource | null> {
        return new Promise((resolve, reject) => {
            // First, get the existing resource
            this.getResourceById(id).then(existingResource => {
                if (!existingResource) {
                    resolve(null);
                    return;
                }

                const updatedResource: Resource = {
                    ...existingResource,
                    ...input,
                    updated_at: new Date().toISOString()
                };

                const sql = `
                    UPDATE resources
                    SET name        = ?,
                        description = ?,
                        category    = ?,
                        status      = ?,
                        updated_at  = ?
                    WHERE id = ?
                `;

                this.db.run(sql, [
                    updatedResource.name,
                    updatedResource.description,
                    updatedResource.category,
                    updatedResource.status,
                    updatedResource.updated_at,
                    id
                ], function (err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(updatedResource);
                    }
                });
            }).catch(reject);
        });
    }

    /**
     * Delete a resource
     */
    async deleteResource(id: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const sql = 'DELETE FROM resources WHERE id = ?';

            this.db.run(sql, [id], function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            });
        });
    }
} 