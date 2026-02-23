import { sql, poolPromise } from '../../config/db.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// ========================= CREATE USER =========================
export const createUser = async (firstname, middlename, lastname, suffix, email, mobile, userType, role, agentCode, region, division, department, opID) => {
    const pool = await poolPromise;
    const tempPassword = crypto.randomBytes(6).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    
    // Start transaction
    const transaction = new sql.Transaction(pool);
    
    try {
        await transaction.begin();
        
        // Insert into CWMUSRINF
        const userResult = await pool.request()
            .input('firstname', sql.VarChar(100), firstname)
            .input('middlename', sql.VarChar(100), middlename || null)
            .input('lastname', sql.VarChar(100), lastname)
            .input('suffix', sql.VarChar(20), suffix || null)
            .input('email', sql.VarChar(255), email)
            .input('mobile', sql.VarChar(50), mobile || null)
            .input('userType', sql.VarChar(20), userType || null)
            .input('role', sql.VarChar(50), role || null)
            .input('agentCode', sql.VarChar(20), agentCode || null)
            .input('region', sql.VarChar(50), region || null)
            .input('division', sql.VarChar(50), division || null)
            .input('department', sql.VarChar(50), department || null)
            .input('opID', sql.VarChar(20), opID || 'SYSTEM')
            .query(`
                INSERT INTO [usr].[CWMUSRINF] 
                (SFNAME, SMNAME, SLNAME, SSUFFIX, SEMAILADD, SMOBILE, SUSRTYPE, SROLE, SAGTCDE, SREG, SDIV, SDEPT, BACTIVE, SOPID, TCRTDT, TMODDT)
                OUTPUT INSERTED.LSEQID AS userId
                VALUES (@firstname, @middlename, @lastname, @suffix, @email, @mobile, @userType, @role, @agentCode, @region, @division, @department, 1, @opID, GETDATE(), GETDATE())
            `);
        
        const userId = userResult.recordset[0].userId;
        
        // Use userId as opID for all subsequent operations
        const createdBy = userId.toString();
        
        // Insert into CWMUSRLGN (login info with temp password)
        await pool.request()
            .input('userId', sql.BigInt, userId)
            .input('password', sql.VarChar(255), hashedPassword)
            .input('opID', sql.VarChar(20), createdBy)
            .query(`
                INSERT INTO [usr].[CWMUSRLGN] 
                (LFKUSRINF, SPASSWORD, BTEMPPW, BACTIVE, SOPID, TCRTDT, TMODDT)
                VALUES (@userId, @password, 1, 1, @opID, GETDATE(), GETDATE())
            `);
        
        // Insert default access levels (VW, EX, IM, IN, UP, DE)
        const defaultAccessLevels = ['VW', 'EX', 'IM', 'IN', 'UP', 'DE'];
        for (const accessLevel of defaultAccessLevels) {
            await pool.request()
                .input('userId', sql.BigInt, userId)
                .input('accessLevel', sql.VarChar(10), accessLevel)
                .input('opID', sql.VarChar(20), createdBy)
                .query(`
                    INSERT INTO [usr].[CWMUSRALVL] 
                    (LFKUSRINF, SACLVL, BACTIVE, SOPID, TMODDT)
                    VALUES (@userId, @accessLevel, 1, @opID, GETDATE())
                `);
        }
        
        await transaction.commit();
        
        return { userId, tempPassword };
        
    } catch (err) {
        await transaction.rollback();
        throw err;
    }
};

// ========================= GET USER BY EMAIL =========================
export const getUserByEmail = async (email) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('email', sql.VarChar(255), email)
        .query(`
            SELECT 
                u.LSEQID AS id,
                u.SFNAME AS firstname,
                u.SMNAME AS middlename,
                u.SLNAME AS lastname,
                u.SSUFFIX AS suffix,
                u.SEMAILADD AS email,
                u.SMOBILE AS mobile,
                u.SUSRTYPE AS userType,
                u.SROLE AS role,
                u.SAGTCDE AS agentCode,
                u.SREG AS regionCode,
                u.SDIV AS divisionCode,
                u.SDEPT AS departmentCode,
                u.BACTIVE AS isActive,
                u.TCRTDT AS createdAt,
                u.TMODDT AS modifiedAt,
                l.SPASSWORD AS password,
                l.BTEMPPW AS mustChangePassword
            FROM [usr].[CWMUSRINF] u
            LEFT JOIN [usr].[CWMUSRLGN] l ON l.LFKUSRINF = u.LSEQID AND l.BACTIVE = 1
            WHERE u.SEMAILADD = @email AND u.BACTIVE = 1
        `);
    return result.recordset[0];
};

// ========================= GET USER BY ID =========================
export const getUserById = async (userId) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('userId', sql.BigInt, userId)
        .query(`
            SELECT 
                u.LSEQID AS id,
                u.SFNAME AS firstname,
                u.SMNAME AS middlename,
                u.SLNAME AS lastname,
                u.SSUFFIX AS suffix,
                u.SEMAILADD AS email,
                u.SMOBILE AS mobile,
                u.SUSRTYPE AS userType,
                u.SROLE AS role,
                u.SAGTCDE AS agentCode,
                u.SREG AS regionCode,
                u.SDIV AS divisionCode,
                u.SDEPT AS departmentCode,
                u.BACTIVE AS isActive,
                l.SPASSWORD AS password,
                l.BTEMPPW AS mustChangePassword
            FROM [usr].[CWMUSRINF] u
            LEFT JOIN [usr].[CWMUSRLGN] l ON l.LFKUSRINF = u.LSEQID AND l.BACTIVE = 1
            WHERE u.LSEQID = @userId AND u.BACTIVE = 1
        `);
    return result.recordset[0];
};

// ========================= VERIFY PASSWORD =========================
export const verifyPassword = async (userId, password) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('userId', sql.BigInt, userId)
        .query(`
            SELECT SPASSWORD 
            FROM [usr].[CWMUSRLGN] 
            WHERE LFKUSRINF = @userId AND BACTIVE = 1
        `);
    
    if (result.recordset.length === 0) return false;
    
    return await bcrypt.compare(password, result.recordset[0].SPASSWORD);
};

// ========================= UPDATE PASSWORD =========================
export const updatePassword = async (email, newPassword) => {
    const pool = await poolPromise;
    const hashed = await bcrypt.hash(newPassword, 10);
    
    // First get user ID from email
    const userResult = await pool.request()
        .input('email', sql.VarChar(255), email)
        .query(`SELECT LSEQID FROM [usr].[CWMUSRINF] WHERE SEMAILADD = @email AND BACTIVE = 1`);
    
    if (userResult.recordset.length === 0) throw new Error('User not found');
    
    const userId = userResult.recordset[0].LSEQID;
    
    await pool.request()
        .input('userId', sql.BigInt, userId)
        .input('password', sql.VarChar(255), hashed)
        .query(`
            UPDATE [usr].[CWMUSRLGN]
            SET SPASSWORD = @password, BTEMPPW = 0, TMODDT = GETDATE()
            WHERE LFKUSRINF = @userId AND BACTIVE = 1
        `);
};

// ========================= UPDATE USER PROFILE =========================
export const updateUserProfile = async (userId, { firstname, middlename, lastname, suffix, mobile }) => {
    const pool = await poolPromise;
    
    // Build dynamic query based on provided fields
    let updateFields = [];
    let request = pool.request().input('userId', sql.BigInt, userId);
    
    if (firstname !== undefined) {
        updateFields.push('SFNAME = @firstname');
        request.input('firstname', sql.VarChar(100), firstname);
    }
    if (middlename !== undefined) {
        updateFields.push('SMNAME = @middlename');
        request.input('middlename', sql.VarChar(100), middlename);
    }
    if (lastname !== undefined) {
        updateFields.push('SLNAME = @lastname');
        request.input('lastname', sql.VarChar(100), lastname);
    }
    if (suffix !== undefined) {
        updateFields.push('SSUFFIX = @suffix');
        request.input('suffix', sql.VarChar(20), suffix);
    }
    if (mobile !== undefined) {
        updateFields.push('SMOBILE = @mobile');
        request.input('mobile', sql.VarChar(50), mobile);
    }
    
    if (updateFields.length === 0) {
        return { message: 'No fields to update' };
    }
    
    updateFields.push('TMODDT = GETDATE()');
    
    const query = `
        UPDATE [usr].[CWMUSRINF]
        SET ${updateFields.join(', ')}
        WHERE LSEQID = @userId AND BACTIVE = 1
    `;
    
    await request.query(query);
    
    return { message: 'Profile updated successfully' };
};

// ========================= SAVE OTP =========================
export const saveOTP = async (userId, otp) => {
    const pool = await poolPromise;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // OTP valid for 5 minutes
    
    // First deactivate any existing OTPs
    await pool.request()
        .input('userId', sql.BigInt, userId)
        .query(`
            UPDATE [usr].[CWMUSROTP]
            SET BACTIVE = 0
            WHERE LFKUSRINF = @userId AND BACTIVE = 1
        `);
    
    // Insert new OTP
    await pool.request()
        .input('userId', sql.BigInt, userId)
        .input('otp', sql.VarChar(6), otp)
        .input('expiresAt', sql.DateTime, expiresAt)
        .input('opID', sql.VarChar(20), 'SYSTEM')
        .query(`
            INSERT INTO [usr].[CWMUSROTP] 
            (LFKUSRINF, SOTP, TOTPEXPDT, BACTIVE, SOPID, TCRTDT, TMODDT)
            VALUES (@userId, @otp, @expiresAt, 1, @opID, GETDATE(), GETDATE())
        `);
};

// ========================= VERIFY OTP =========================
export const verifyOTP = async (userId, otp) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('userId', sql.BigInt, userId)
        .input('otp', sql.VarChar(6), otp)
        .query(`
            SELECT TOTPEXPDT
            FROM [usr].[CWMUSROTP]
            WHERE LFKUSRINF = @userId
            AND SOTP = @otp
            AND BACTIVE = 1
        `);

    if (result.recordset.length === 0) return false;

    const now = new Date();
    const expiresAt = result.recordset[0].TOTPEXPDT;
    return now <= expiresAt; 
};

// ========================= CLEAR OTP =========================
export const clearOTP = async (userId) => {
    const pool = await poolPromise;
    await pool.request()
        .input('userId', sql.BigInt, userId)
        .query(`
            UPDATE [usr].[CWMUSROTP]
            SET BACTIVE = 0
            WHERE LFKUSRINF = @userId AND BACTIVE = 1
        `);
};

// ========================= SAVE REFRESH TOKEN =========================
export const saveRefreshToken = async (userId, refreshToken, expiresAt) => {
    const pool = await poolPromise;
    
    // First deactivate any existing tokens
    await pool.request()
        .input('userId', sql.BigInt, userId)
        .query(`
            UPDATE [usr].[CWMUSRTKN]
            SET BACTIVE = 0
            WHERE LFKUSRINF = @userId AND BACTIVE = 1
        `);
    
    // Insert new refresh token
    await pool.request()
        .input('userId', sql.BigInt, userId)
        .input('refreshToken', sql.VarChar(500), refreshToken)
        .input('expiresAt', sql.DateTime, expiresAt)
        .input('opID', sql.VarChar(20), 'SYSTEM')
        .query(`
            INSERT INTO [usr].[CWMUSRTKN] 
            (LFKUSRINF, SREFTKN, TREFTKNEXPDT, BACTIVE, SOPID, TCRTDT, TMODDT)
            VALUES (@userId, @refreshToken, @expiresAt, 1, @opID, GETDATE(), GETDATE())
        `);
};

// ========================= GET USER BY REFRESH TOKEN =========================
export const getUserByRefreshToken = async (refreshToken) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('refreshToken', sql.VarChar(500), refreshToken)
        .query(`
            SELECT 
                u.LSEQID AS id,
                u.SFNAME AS firstname,
                u.SMNAME AS middlename,
                u.SLNAME AS lastname,
                u.SEMAILADD AS email,
                u.SUSRTYPE AS userType,
                u.SROLE AS role,
                t.TREFTKNEXPDT AS tokenExpiresAt
            FROM [usr].[CWMUSRTKN] t
            JOIN [usr].[CWMUSRINF] u ON u.LSEQID = t.LFKUSRINF
            WHERE t.SREFTKN = @refreshToken 
            AND t.BACTIVE = 1 
            AND u.BACTIVE = 1
        `);
    return result.recordset[0];
};

// ========================= GET ACCESS LEVELS =========================
export const getAccessLevels = async (userId) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('userId', sql.BigInt, userId)
        .query(`
            SELECT SACLVL AS accessLevel
            FROM [usr].[CWMUSRALVL]
            WHERE LFKUSRINF = @userId AND BACTIVE = 1
        `);
    return result.recordset.map(row => row.accessLevel);
};

// ========================= LOGOUT (CLEAR TOKENS) =========================
export const logoutUser = async (userId) => {
    const pool = await poolPromise;
    
    // Clear OTP
    await pool.request()
        .input('userId', sql.BigInt, userId)
        .query(`
            UPDATE [usr].[CWMUSROTP]
            SET BACTIVE = 0
            WHERE LFKUSRINF = @userId AND BACTIVE = 1
        `);
    
    // Clear refresh token
    await pool.request()
        .input('userId', sql.BigInt, userId)
        .query(`
            UPDATE [usr].[CWMUSRTKN]
            SET BACTIVE = 0
            WHERE LFKUSRINF = @userId AND BACTIVE = 1
        `);
};

// ========================= CHECK IF EMAIL EXISTS =========================
export const emailExists = async (email) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('email', sql.VarChar(255), email)
        .query(`
            SELECT LSEQID 
            FROM [usr].[CWMUSRINF] 
            WHERE SEMAILADD = @email AND BACTIVE = 1
        `);
    return result.recordset.length > 0;
};

// ========================= REFERENCE DATA =========================
export const getUserTypes = async () => {
    const pool = await poolPromise;
    const result = await pool.request()
        .query(`
            SELECT LSEQID, SDETCODE AS code, SDETDESC AS description
            FROM [ref].[CWMMASTERDET]
            WHERE LFKMASTERHDR = 3 AND BACTIVE = 1
            ORDER BY SDETDESC
        `);
    return result.recordset;
};

export const getRoles = async () => {
    const pool = await poolPromise;
    const result = await pool.request()
        .query(`
            SELECT LSEQID, SDETCODE AS code, SDETDESC AS description
            FROM [ref].[CWMMASTERDET]
            WHERE LFKMASTERHDR = 4 AND BACTIVE = 1
            ORDER BY SDETDESC
        `);
    return result.recordset;
};

export const getAccessLevelOptions = async () => {
    const pool = await poolPromise;
    const result = await pool.request()
        .query(`
            SELECT LSEQID, SDETCODE AS code, SDETDESC AS description
            FROM [ref].[CWMMASTERDET]
            WHERE LFKMASTERHDR = 1 AND BACTIVE = 1
            ORDER BY SDETDESC
        `);
    return result.recordset;
};
