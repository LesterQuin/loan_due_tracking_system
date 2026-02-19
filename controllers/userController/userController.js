import * as User from '../../models/userModel/userModel.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
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

// ========================= REGISTER =========================
export const register = async (req, res) => {
    try {
        let { firstname, middlename, lastname, suffix, email, mobile, userType, role, agentCode } = req.body;

        // normalize optional fields
        agentCode = agentCode?.trim() || null;
        mobile = mobile?.trim() || null;
        userType = userType?.trim() || null;
        role = role?.trim() || null;

        // ONLY truly required fields
        if (!firstname || !lastname || !email) {
            return res.status(400).json({
                status: false,
                message: "Missing required fields"
            });
        }

        const emailRegex = /^[\w.-]+@(gmail\.com|yahoo\.com|phillifeassurance\.onmicrosoft\.com)$/i;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                status: false,
                message: "Invalid domain address"
            });
        }

        // Check if email already exists
        const exists = await User.emailExists(email);
        if (exists) {
            return res.status(400).json({
                status: false,
                message: "Email already registered."
            });
        }

        // Validate userType if provided
        if (userType) {
            const validUserTypes = ['AGENT', 'BRANCH', 'DEPT'];
            if (!validUserTypes.includes(userType)) {
                return res.status(400).json({
                    status: false,
                    message: "Invalid userType"
                });
            }
        }

        // Validate role if provided
        if (role) {
            const validRoles = ['SD', 'MD', 'CCO', 'CCA'];
            if (!validRoles.includes(role)) {
                return res.status(400).json({
                    status: false,
                    message: "Invalid role"
                });
            }
        }

        const opID = req.body.opID || 'SYSTEM';

        const newUser = await User.createUser(
            firstname,
            middlename,
            lastname,
            suffix,
            email,
            mobile,
            userType,
            role,
            agentCode,
            opID
        );

        // Send email with temp password
        await transporter.sendMail({
            from: `"LDTS System" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Your Temporary Password',
            html: tempPasswordTemplate(
                lastname,
                newUser.tempPassword,
                process.env.APP_BASE_URL
            )
        });

        res.status(201).json({
            status: true,
            message: "User registered, temporary password sent via email"
        });

    } catch (err) {
        console.error('REGISTRATION ERROR:', err);
        res.status(500).json({
            status: false,
            message: 'Server error',
            error: err.message
        });
    }
};

// ========================= LOGIN =========================
export const login = async (req, res) => {
    try {
        const { email, password, newPassword } = req.body;
        if (!email || !password) 
            return res.status(400).json({  
            status: false,
            message: 'Email and Password required.' 
        });

        const user = await User.getUserByEmail(email);
        if (!user) 
            return res.status(401).json({
            status: false,
            message: 'Invalid credentials.' 
        });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) 
            return res.status(401).json({ 
                status: false, 
                message: 'Invalid credentials.' 
            });

        // Handle temp password change
        if (user.mustChangePassword) {
            if (!newPassword) 
                return res.status(403).json({  
                    status: false,
                    message: 'Password reset required. Please provide a new password.' 
                });

            // Validate new password
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;
            if (!passwordRegex.test(newPassword)) 
                return res.status(400).json({ 
                    status: false,
                    message: 'New password must be 8+ chars, include upper, lower, number' 
                });

            // Update password
            await User.updatePassword(email, newPassword);
        }

        // Generate OTP
        const otp = generateOTP();
        await User.saveOTP(user.id, otp);

        // Send OTP email
        await transporter.sendMail({
            from: `"LDTS System" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Your Login OTP',
            html: otpTemplate(user.lastname, otp)
        });

        res.json({ 
            status: true, 
            message: 'OTP sent to your email. Please verify to complete login.' 
        });

    } catch (err) {
        console.error('LOGIN ERROR:', err);
        res.status(500).json({ 
            status: false, 
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

        const user = await User.getUserByEmail(email);
        if (!user)  
            return res.status(401).json({ message: 'Invalid credentials.' });

        // Verify OTP
        const isValid = await User.verifyOTP(user.id, otp);
        if (!isValid) 
            return res.status(401).json({ message: 'Invalid or expired OTP.' });

        // Clear OTP
        await User.clearOTP(user.id);

        // Generate tokens
        const payload = { id: user.id, email: user.email, userType: user.userType };
        const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
        const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN });
        
        // Save refresh token
        const accessTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
        const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        await User.saveRefreshToken(user.id, refreshToken, refreshTokenExpiry);

        res.cookie('ldtsAuth', refreshToken, { 
            httpOnly: true,
            secure: true, 
            sameSite: 'None',  
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        // Get access levels
        const accessLevels = await User.getAccessLevels(user.id);

        res.json({ 
            message: 'Login successful',
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                firstname: user.firstname,
                middlename: user.middlename,
                lastname: user.lastname,
                suffix: user.suffix,
                mobile: user.mobile,
                userType: user.userType || null,
                role: user.role || null,
                agentCode: user.agentCode || null,
                regionCode: user.regionCode || null,
                divisionCode: user.divisionCode || null,
                departmentCode: user.departmentCode || null
            },
            accessLevels,
            scope: accessLevels // Using access levels as scope
        });

    } catch (err) {
        console.error('VERIFY OTP ERROR:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// ========================= REFRESH TOKEN =========================
export const refreshToken = async (req, res) => {
    try {
        const refreshToken = req.cookies?.ldtsAuth;
        
        if (!refreshToken) {
            return res.status(400).json({
                status: false,
                message: 'Refresh token required.'
            });
        }

        const user = await User.getUserByRefreshToken(refreshToken);
        if (!user) {
            return res.status(404).json({
                status: false,
                message: 'User not found.'
            });
        }

        // Check if token is expired
        if (new Date(user.tokenExpiresAt) < new Date()) {
            return res.status(401).json({
                status: false,
                message: 'Refresh token expired.'
            });
        }

        // Generate new access token
        const payload = {
            id: user.id,
            email: user.email,
            userType: user.userType
        };

        const newAccessToken = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.json({
            status: true,
            message: 'Access token refreshed.',
            accessToken: newAccessToken,
            user: {
                id: user.id,
                email: user.email,
                firstname: user.firstname,
                middlename: user.middlename,
                lastname: user.lastname,
                userType: user.userType,
                role: user.role
            },
        });

    } catch (err) {
        console.error("REFRESH TOKEN ERROR:", err);
        res.status(500).json({ 
            status: false, 
            message: "Server error", error: err.message 
        });
    }
};

// ========================= LOGOUT =========================
export const logout = async (req, res) => {
    try {
        const { email, refreshToken } = req.body;

        if (!email || !refreshToken) 
            return res.status(400).json({ 
                status: false,  
                message: "Email and refreshToken required" 
            });

        const user = await User.getUserByEmail(email);
        if (!user) 
            return res.status(404).json({
                status: false,  
                message: "User not found" 
            });

        // Clear tokens
        await User.logoutUser(user.id);

        res.json({
            status: true, 
            message: "Logged out successfully" 
        });

    } catch (err) {
        console.error("LOGOUT ERROR:", err);
        res.status(500).json({ 
            status: false, 
            message: "Server error", error: err.message 
        });
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

        await User.updatePassword(email, newPassword);
        res.json({ 
            status: true,  
            message: 'Password updated successfully.' 
        });

    } catch (err) {
        console.error('RESET PASSWORD ERROR:', err);
        res.status(500).json({ 
            status: false,  
            message: 'Server error', error: err.message 
        });
    }
};

// ========================= RESEND OTP =========================
export const resendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ 
            status: false, 
            message: 'Email required.' 
        });

        const user = await User.getUserByEmail(email);
        if (!user) return res.status(404).json({ 
            status: false,  
            message: 'User not found.' 
        });

        // Generate OTP
        const otp = generateOTP();
        await User.saveOTP(user.id, otp); 

        await transporter.sendMail({
            from: `"LDTS System" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Your Login OTP',
            html: otpTemplate(user.lastname, otp)
        });

        res.json({ 
            status: true,  
            message: 'OTP resent successfully.' 
        });

    } catch (err) {
        console.error('RESEND OTP ERROR:', err);
        res.status(500).json({ 
            status: false,  
            message: 'Server error', error: err.message 
        });
    }
};
