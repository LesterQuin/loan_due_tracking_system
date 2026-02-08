import { sql, poolPromise } from '../../config/db.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// ========================= CREATE AGENT =========================
export const createAgent = async (firstname, middlename, lastname, email, agentCode, departmentId, regionId, divisionId, userType) => {
    const pool = await poolPromise;
    const tempPassword = crypto.randomBytes(6).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const result = await pool.request()
        .input('firstname', sql.VarChar, firstname)
        .input('middlename', sql.VarChar, middlename || null)
        .input('lastname', sql.VarChar, lastname)
        .input('email', sql.VarChar, email)
        .input('agentCode', sql.VarChar, agentCode || null)
        .input('userType', sql.VarChar, userType)
        .input('departmentId', sql.Int, departmentId)
        .input('regionId', sql.Int, regionId)
        .input('divisionId', sql.Int, divisionId || null)
        .input('password', sql.VarChar, hashedPassword)
        .input('mustChangePassword', sql.Bit, 1)
        .query(`
            INSERT INTO ldts_Agents
            (firstname, middlename, lastname, email, agentCode, userType, departmentId, regionId, divisionId, password, mustChangePassword)
            OUTPUT INSERTED.id AS agentId
            VALUES (@firstname, @middlename, @lastname, @email, @agentCode, @userType, @departmentId, @regionId, @divisionId, @password, @mustChangePassword)
        `);

    return { ...result.recordset[0], tempPassword };
};

export const isValidDivision = async (regionId, divisionId) => {
    if (!divisionId) return true;
    const pool = await poolPromise;
    const result = await pool.request()
        .input('regionId', sql.Int, regionId)
        .input('divisionId', sql.Int, divisionId)
        .query(`
            SELECT id
            FROM ldts_Divisions
            WHERE id = @divisionId
            AND regionID = @regionId
            AND isActive = 1
        `);
    return result.recordset.length > 0;
;}

// ========================= UPDATE PASSWORD =========================
export const updatePassword = async (email, newPassword) => {
    const pool = await poolPromise;
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.request()
        .input('email', sql.VarChar, email)
        .input('password', sql.VarChar, hashed)
        .query(`
            UPDATE ldts_Agents
            SET password = @password, mustChangePassword = 0, modified_at = GETDATE()
            WHERE email = @email
        `);
};

// ========================= VALIDATIONS =========================
export const isValidDepartment = async (departmentId) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('id', sql.Int, departmentId)
        .query(`SELECT id FROM ldts_Departments WHERE id = @id AND isActive = 1`);
    return result.recordset.length > 0;
};

export const isValidRegion = async (regionId) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('id', sql.Int, regionId)
        .query(`SELECT id FROM ldts_Regions WHERE id = @id AND isActive = 1`);
    return result.recordset.length > 0;
};

// ========================= GET AGENT =========================
export const getAgentByEmail = async (email) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('email', sql.VarChar, email)
        .query(`SELECT * FROM ldts_Agents WHERE email = @email`);
    return result.recordset[0];
};

// ========================= OTP FUNCTIONS =========================
// Save OTP with expiry (5 mins)
// ========================= SAVE OTP =========================
export const saveOTP = async (agentId, otp) => {
    const pool = await poolPromise;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // OTP valid for 5 minutes
    await pool.request()
        .input('agentId', sql.Int, agentId)
        .input('otp', sql.Char(6), otp)
        .input('expiresAt', sql.DateTime, expiresAt)
        .query(`
            UPDATE ldts_Agents
            SET otpCode = @otp, otpExpiresAt = @expiresAt, mustVerifyOtp = 1
            WHERE id = @agentId
        `);
};

// ========================= VERIFY OTP =========================
export const verifyOTP = async (agentId, otp) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('agentId', sql.Int, agentId)
        .input('otp', sql.Char(6), otp)
        .query(`
            SELECT otpExpiresAt
            FROM ldts_Agents
            WHERE id = @agentId
            AND otpCode = @otp
            AND mustVerifyOtp = 1
        `);

    if (result.recordset.length === 0) return false;

    const now = new Date();
    const expiresAt = result.recordset[0].otpExpiresAt;
    return now <= expiresAt; 
};

// ========================= CLEAR OTP =========================
export const clearOtp = async (agentId) => {
    const pool = await poolPromise;
    await pool.request()
        .input('agentId', sql.Int, agentId)
        .query(`
            UPDATE ldts_Agents
            SET mustVerifyOtp = 0, otpCode = NULL, otpExpiresAt = NULL
            WHERE id = @agentId
        `);
};


// ========================= LOGOUT =========================
export const logoutAgent = async (email) => {
    const pool = await poolPromise;
    await pool.request()
        .input('email', sql.VarChar, email)
        .query(`
            UPDATE ldts_Agents
            SET mustVerifyOtp = 0, otpCode = NULL, otpExpiresAt = NULL
            WHERE email = @email
        `);
};

// Save refresh token in database
export const saveRefreshToken = async (agentId, refreshToken, expiresAt) => {
    const pool = await poolPromise;
    await pool.request()
        .input('agentId', sql.Int, agentId)
        .input('refreshToken', sql.VarChar, refreshToken)
        .input('expiresAt', sql.DateTime, expiresAt)
        .query(`
            INSERT INTO ldts_AgentTokens (agentId, refreshToken, created_at, expires_at)
            VALUES (@agentId, @refreshToken, GETDATE(), @expiresAt)
        `);
};