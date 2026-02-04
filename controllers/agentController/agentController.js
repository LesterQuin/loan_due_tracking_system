import * as Agent from '../../models/agentModel/agentModel.js';
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
    secure: false,   // true for port 465, false for 587
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    },
    logger: true,    // logs SMTP conversation
    debug: true      // outputs debug messages to console
});

// Helper: generate random OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// ========================= REGISTER =========================
export const register = async (req, res) => {
    try {
        const { firstname, middlename, lastname, email, departmentId, regionId, userType } = req.body;

        if (!firstname || !lastname || !email || !departmentId || !userType){
        return res.status(400).json({ message: "Missing required fields" });
        }

        const emailRegex = /^[\w.-]+@(gmail\.com|yahoo\.com|phillife\.com\.ph)$/i;
        if (!emailRegex.test(email)) return res.status(400).json({ message: "Invalid domain address" });

        if (!['CCO', 'Agent'].includes(userType)) return res.status(400).json({ message: "Invalid userType." });

        const validDept = await Agent.isValidDepartment(departmentId);
        if (!validDept) return res.status(400).json({ message: "Invalid departmentId" });

        const validReg = regionId ? await Agent.isValidRegion(regionId) : true;
        if (!validReg) return res.status(400).json({ message: "Invalid regionId" });

        const existing = await Agent.getAgentByEmail(email);
        if (existing) return res.status(400).json({ message: "Email already registered." });

        // Create agent with temp password
        const newAgent = await Agent.createAgent(
        firstname, middlename, lastname, email, departmentId, regionId, userType
        );

        // Send temp password email
        await transporter.sendMail({
        from: `"LDTS System" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Your Temporary Password',
        html: tempPasswordTemplate(firstname, newAgent.tempPassword, process.env.APP_BASE_URL)
        });

        res.status(201).json({
        message: "Agent registered, temporary password sent via email"
        });

    } catch (err) {
        console.error('REGISTRATION ERROR:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// ========================= LOGIN =========================
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: 'Email and Password required.' });

        const agent = await Agent.getAgentByEmail(email);
        if (!agent) return res.status(401).json({ message: 'Invalid credentials.' });

        const validPassword = await bcrypt.compare(password, agent.password);
        if (!validPassword) return res.status(401).json({ message: 'Invalid credentials.' });

        // Check if agent must change password
        if (agent.mustChangePassword) {
        return res.status(403).json({ message: 'Password reset required. Please change your password before login.' });
        }

        // Check if OTP already sent
        let otp = generateOTP();
        await Agent.saveOTP(agent.id, otp); // save OTP with expiry in DB (you'll need this function)

        // Send OTP email
        await transporter.sendMail({
        from: `"LDTS System" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Your Login OTP',
        html: otpTemplate(agent.firstname, otp)
        });

        res.json({ message: 'OTP sent to your email. Please verify before login.' });

    } catch (err) {
        console.error('LOGIN ERROR:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// ========================= VERIFY OTP =========================
export const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ message: 'Email and OTP required.' });

        const agent = await Agent.getAgentByEmail(email);
        if (!agent) return res.status(401).json({ message: 'Invalid credentials.' });

        const isValid = await Agent.verifyOTP(agent.id, otp); // compare OTP & check expiry
        if (!isValid) return res.status(401).json({ message: 'Invalid or expired OTP.' });

        // Clear OTP after successful verification
        await Agent.clearOtp(agent.id);

        // Generate tokens
        const payload = { id: agent.id, email: agent.email, userType: agent.userType };
        const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
        const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN });

        res.json({ message: 'Login successful', accessToken, refreshToken });

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
        res.json({ message: 'Password updated successfully.' });

    } catch (err) {
        console.error('RESET PASSWORD ERROR:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// ========================= RESEND OTP =========================
export const resendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email required.' });

        const agent = await Agent.getAgentByEmail(email);
        if (!agent) return res.status(404).json({ message: 'Agent not found.' });

        const otp = generateOTP();
        await Agent.saveOTP(agent.id, otp); 

        await transporter.sendMail({
        from: `"LDTS System" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Your Login OTP',
        html: otpTemplate(agent.firstname, otp)
        });

        res.json({ message: 'OTP resent successfully.' });

    } catch (err) {
        console.error('RESEND OTP ERROR:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
