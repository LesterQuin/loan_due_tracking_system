import { sql, poolPromise } from '../../config/db.js';
import * as Agent from '../../models/agentModel/agentModel.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { resolveScope } from '../../utils/scope.js';
import { tempPasswordTemplate } from '../../templates/tempPasswordTemplate.js';
import { otpTemplate } from '../../templates/otpTemplate.js';

dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: false,   
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    },
    logger: true,    
    debug: true      
});

// Helper: generate random OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// ========================= PERMISSIONS =========================
export const getDepartmentPermissions = (agent) => {
    // Priority: userType overrides department
    if (agent.userType) {
        switch (agent.userType) {
            case 'Admin':
            case 'MD':
                return { canUpload: true, canImport: true, canExport: true, viewOnly: false };
            case 'SD':
                return { canUpload: false, canImport: false, canExport: true, viewOnly: false };
            case 'FC':
                return { canUpload: false, canImport: false, canExport: false, viewOnly: true };
        }
    }

    // Fallback based on numeric departmentId
    switch (agent.departmentId) {
        case 1: // PLA
            return { canUpload: true, canImport: true, canExport: false, viewOnly: true };
        case 2: // LMG
            return { canUpload: true, canImport: true, canExport: true, viewOnly: false };
        case 3: // OP
            return { canUpload: false, canImport: false, canExport: false, viewOnly: true };
        default:
            return { canUpload: false, canImport: false, canExport: false, viewOnly: true };
    }
};

// ========================= REGISTER =========================
export const register = async (req, res) => {
    try {
        let { firstname, middlename, lastname, email, agentCode, departmentId, regionId, divisionId, userType, phoneNumber } = req.body;

        // normalize optional fields
        agentCode = agentCode?.trim() || null;
        divisionId = divisionId || null;
        phoneNumber = phoneNumber?.trim() || null;
        userType = userType?.trim() || null; 

        if (!firstname || !lastname || !email || !departmentId || !regionId) {
            return res.status(400).json({  
                status: 'false', 
                message: "Missing required fields" 
            });
        }

        const emailRegex = /^[\w.-]+@(gmail\.com|yahoo\.com|phillifeassurance\.onmicrosoft\.com)$/i;
        if (!emailRegex.test(email)) 
            return res.status(400).json({ 
                status: 'false', 
                message: "Invalid domain address" 
            });

        // Validate userType only if provided
        if (userType && !['Admin', 'MD', 'SD', 'FC'].includes(userType)) {
            return res.status(400).json({ 
                status: 'false', 
                message: "Invalid userType." 
            });
        }

        const validDept = await Agent.isValidDepartment(departmentId);
        if (!validDept) 
            return res.status(400).json({ 
                status: 'false', 
                message: "Invalid departmentId" 
            });

        const validReg = regionId ? await Agent.isValidRegion(regionId) : true;
        if (!validReg) 
            return res.status(400).json({ 
                status: 'false', 
                message: "Invalid regionId" 
            });

        const validDiv = await Agent.isValidDivision(regionId, divisionId);
        if (!validDiv) 
            return res.status(400).json({ 
                status: 'false', 
                message: "Invalid division for the selected region."
            });

        const existing = await Agent.getAgentByEmail(email);
        if (existing) 
            return res.status(400).json({ 
                status: 'false', 
                message: "Email already registered." 
            });

        // Create agent with temp password
        const newAgent = await Agent.createAgent(
            firstname, middlename, lastname, email, agentCode, departmentId, regionId, divisionId, userType, phoneNumber
        );

        // Send temp password email
        await transporter.sendMail({
            from: `"LDTS System" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Your Temporary Password',
            html: tempPasswordTemplate(lastname, newAgent.tempPassword, process.env.APP_BASE_URL)
        });

        res.status(201).json({
            status: 'true',
            message: "Agent registered, temporary password sent via email"
        });

    } catch (err) {
        console.error('REGISTRATION ERROR:', err);
        res.status(500).json({ 
            status: 'false', 
            message: 'Server error', error: err.message 
        });
    }
};

// ========================= LOGIN =========================
export const login = async (req, res) => {
    try {
        const { email, password, newPassword } = req.body;
        if (!email || !password) 
            return res.status(400).json({  
            status: 'false',
            message: 'Email and Password required.' 
        });

        const agent = await Agent.getAgentByEmail(email);
        if (!agent) 
            return res.status(401).json({
            status: 'false',
            message: 'Invalid credentials.' 
        });

        const validPassword = await bcrypt.compare(password, agent.password);
        if (!validPassword) 
            return res.status(401).json({ 
                status: 'false', 
                message: 'Invalid credentials.' 
            });

        // Handle temp password change
        if (agent.mustChangePassword) {
            if (!newPassword) 
                return res.status(403).json({  
                    status: 'false',
                    message: 'Password reset required. Please provide a new password.' 
                });

            // Validate new password
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;
            if (!passwordRegex.test(newPassword)) 
                return res.status(400).json({ 
                    status: 'false',
                    message: 'New password must be 8+ chars, include upper, lower, number' 
                });

            // Update password
            await Agent.updatePassword(email, newPassword);
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await Agent.saveOTP(agent.id, otp);

        // Send OTP email
        await transporter.sendMail({
            from: `"LDTS System" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Your Login OTP',
            html: otpTemplate(agent.lastname, otp)
        });

        res.json({ 
            status: 'true', 
            message: 'OTP sent to your email. Please verify to complete login.' 
        });

    } catch (err) {
        console.error('LOGIN ERROR:', err);
        res.status(500).json({ 
            status: 'false', 
            message: 'Server error', error: err.message 
        });
    }
};

// ========================= VERIFY OTP =========================
export const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) 
            return res.status(400).json({ message: 'Email and OTP required.' });

        const agent = await Agent.getAgentByEmail(email);
        if (!agent) 
            return res.status(401).json({ message: 'Invalid credentials.' });

        // Verify OTP
        const isValid = await Agent.verifyOTP(agent.id, otp);
        if (!isValid) 
            return res.status(401).json({ message: 'Invalid or expired OTP.' });

        // Clear OTP
        await Agent.clearOtp(agent.id);

        // Generate tokens
        const payload = { id: agent.id, email: agent.email, userType: agent.userType };
        const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
        const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN });
        
        // Save Access Token
        const accessTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
        await Agent.saveTokens(agent.id, accessToken, refreshToken, accessTokenExpiry);

        const permissions = getDepartmentPermissions(agent);
        const scope = resolveScope(agent);

        const regions = await Agent.getRegions();
        const departments = await Agent.getDepartments();
        const divisions = await Agent.getDivisionsByRegion(agent.regionId); 

        // Fetch reference data
        const region = regions.find(r => r.id === agent.regionId);
        const department = departments.find(d => d.id === agent.departmentId);
        const division = divisions.find(d => d.id === agent.divisionId);

        res.json({ 
            message: 'Login successful',
            accessToken,
            refreshToken,
            user: {
                id: agent.id,
                email: agent.email,
                firstname: agent.firstname,
                middlename: agent.middlename,
                lastname: agent.lastname,
                agentCode: agent.agentCode,
                phoneNumber: agent.phoneNumber,
                userType: agent.userType,
                departmentId: agent.departmentId,
                departmentName: department?.departmentName || null,
                regionId: agent.regionId,
                regionName: region?.regionName || null,
                divisionId: agent.divisionId,
                divisionName: division?.divisionName || null
            },
            permissions,
            scope
        });

    } catch (err) {
        console.error('VERIFY OTP ERROR:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// ========================= RESET PASSWORD =========================
export const resetPassword = async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        if (!newPassword) return res.status(400).json({ message: 'New password required.' });

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;
        if (!passwordRegex.test(newPassword)) return res.status(400).json({
        message: 'Password must be 8+ chars, include upper, lower, number'
        });

        await Agent.updatePassword(email, newPassword);
        res.json({ 
            status: 'true',  
            message: 'Password updated successfully.' 
        });

    } catch (err) {
        console.error('RESET PASSWORD ERROR:', err);
        res.status(500).json({ 
            status: 'false',  
            message: 'Server error', error: err.message 
        });
    }
};

// ========================= RESEND OTP =========================
export const resendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ 
            status: 'false', 
            message: 'Email required.' 
        });

        const agent = await Agent.getAgentByEmail(email);
        if (!agent) return res.status(404).json({ 
            status: 'false',  
            message: 'Agent not found.' 
        });

        // OTP Validation
        if (agent.mustVerifyOtp && agent.otpExpiresAt) {
            const now = new Date();
            const expiresAt = new Date(agent.otpExpiresAt);

            if (now < expiresAt) {
                const remainingSeconds = Math.ceil((expiresAt - now) / 1000);
                
                return res.status(429).json({
                    status: 'false',
                    message: `OTP is still active. Please wait ${remainingSeconds} seconds before requesting new one.`
                });
            }
        }
        
        // Generate OTP
        const otp = generateOTP();
        await Agent.saveOTP(agent.id, otp); 

        await transporter.sendMail({
        from: `"LDTS System" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Your Login OTP',
        html: otpTemplate(agent.lastname, otp)
        });

        res.json({ 
            status: 'true',  
            message: 'OTP resent successfully.' 
        });

    } catch (err) {
        console.error('RESEND OTP ERROR:', err);
        res.status(500).json({ 
            status: 'false',  
            message: 'Server error', error: err.message 
        });
    }
};

// ========================= LOGOUT =========================
export const logout = async (req, res) => {
    try {
        const { email, refreshToken } = req.body;

        if (!email || !refreshToken) 
            return res.status(400).json({ 
                status: 'false',  
                message: "Email and refreshToken required" 
            });

        const agent = await Agent.getAgentByEmail(email);
        if (!agent) 
            return res.status(404).json({
                status: 'false',  
                message: "Agent not found" 
            });

        // Validate refresh token
        if (!agent.refreshToken || agent.refreshToken !== refreshToken) {
            return res.status(401).json({
                status: 'false',
                message: 'Invalid refresh token'
            });
        }

        // Clear token
        await Agent.clearOtp(agent.id);

        // Optional: clear OTP flags if still set
        await Agent.logoutAgent(email);

        res.json({
            status: 'true', 
            message: "Logged out successfully" 
        });

    } catch (err) {
        console.error("LOGOUT ERROR:", err);
        res.status(500).json({ 
            status: 'false', 
            message: "Server error", error: err.message 
        });
    }
};

// ========================= REFRESH TOKEN =========================
export const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                status: 'false',
                message: 'Refresh token required.'
            });
        }

        // Verify refresh token 
        let decoded;
        try {
            decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        } catch (err) {
            return res.status(401).json({
                status: 'false',
                message: 'Invalid or expired refresh token.'
            });
        }

        // Fetch Agent
        const agent = await Agent.getAgentByEmail(decoded.email);
        if (!agent) {
            return res.status(404).json({
                status: 'false',
                message: 'Agent not found.'
            });
        }

        // Match token
        if (!agent.refreshToken || agent.refreshToken !== refreshToken) {
            return res.status(401).json({
                status: 'false',
                message: 'Refresh token mismatch.'
            });
        }

        // Fetch reference data
        const regions = await Agent.getRegions();
        const departments = await Agent.getDepartments();
        const divisions = await Agent.getDivisionsByRegion(agent.regionId);

        const region = regions.find(r => r.id === agent.regionId) || { regionName: null };
        const department = departments.find(d => d.id === agent.departmentId) || { departmentName: null };
        const division = divisions.find(d => d.id === agent.divisionId) || { divisionName: null };

        // Generate new access token
        const payload = {
            id: agent.id,
            email: agent.email,
            userType: agent.userType
        };

        const newAccessToken = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        const accessTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

        await Agent.saveTokens(
            agent.id,
            newAccessToken,
            refreshToken,
            accessTokenExpiry
        );

        res.json({
            status: 'true',
            message: 'Access token refreshed.',
            accessToken: newAccessToken,
            user: {
                id: agent.id,
                email: agent.email,
                firstname: agent.firstname,
                middlename: agent.middlename,
                lastname: agent.lastname,
                agentCode: agent.agentCode,
                phoneNumber: agent.phoneNumber,
                userType: agent.userType,
                departmentId: agent.departmentId,
                departmentName: department?.departmentName || null,
                regionId: agent.regionId,
                regionName: region?.regionName || null,
                divisionId: agent.divisionId,
                divisionName: division?.divisionName || null
            },
        });

        
    } catch (err) {
        console.error("REFRESH TOKEN ERROR:", err);
        res.status(500).json({ 
            status: 'false', 
            message: "Server error", error: err.message 
        });
    }
}