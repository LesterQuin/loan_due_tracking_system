import { poolPromise, sql } from '../../config/db.js'

export const createDestination = async ({ userType, destinationName }) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('userType', sql.VarChar(50), userType)
        .input('destinationName', sql.VarChar(50), destinationName || null)
        .query(`
            INSERT INTO ldts_Destinations (userType, destinationName, created_at, modified_at)
            VALUES (@userType, @destinationName, GETDATE(), GETDATE());
            SELECT SCOPE_IDENTITY() AS destinationId;
        `);
    return result.recordset[0];
};

export const getAllDestinations = async () => {
    const pool = await poolPromise;
    const result = await pool.request()
        .query(`
            SELECT * 
            FROM ldts_Destinations 
            ORDER BY id ASC
        `);
    return result.recordset;
};