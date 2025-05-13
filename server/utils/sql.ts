import { pool } from '../db';

/**
 * Execute a SQL query directly and return the results
 * @param query SQL query to execute
 * @param params Optional parameters for the query
 * @returns The query results
 */
export async function execute_sql_tool(query: string, params: any[] = []): Promise<any[]> {
  try {
    console.log('Executing SQL query:', query);
    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('SQL execution error:', error);
    throw error;
  }
}