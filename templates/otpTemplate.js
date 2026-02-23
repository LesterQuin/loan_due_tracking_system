// templates/otpTemplate.js
export const otpTemplate = (lastname, otp) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>One-Time Password</title>
</head>
<body style="margin:0;padding:0;font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background:#f8f9fa; color:#333;">
    <table role="presentation" style="width:100%; max-width:600px; margin:20px auto; background:#fff; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.1); overflow:hidden; border-collapse:collapse;">

        <!-- Header -->
        <tr>
        <td 
            bgcolor="#4caf50" 
            style="background-color:#4caf50; 
                   background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
                   text-align:center; 
                   padding:20px; 
                   color:white;">
            <h1 style="margin:0; font-size:24px; font-weight:300;">Loan Due Tracking System OTP Verification</h1>
            <p style="margin:5px 0 0; font-size:14px; opacity:0.9;">Secure login code</p>
        </td>
        </tr>

        <!-- Content -->
        <tr>
        <td style="padding:30px 25px;">
            <p style="margin:0 0 20px; font-size:16px;">Hello Mr/Mrs, <strong>${lastname}</strong></p>
            <p style="margin:0 0 25px; font-size:16px;">Your One-Time Password (OTP) is:</p>

            <!-- OTP Highlight -->
            <div style="text-align:center; margin:25px 0; padding:25px; background:#fff3e0; border:2px solid #4caf50; border-radius:10px; box-shadow:0 2px 8px rgba(255,152,0,0.2);">
            <h2 style="margin:0; font-size:36px; font-weight:bold; color:#2c5530; letter-spacing:2px; font-family:'Courier New', monospace;">${otp}</h2>
            </div>

            <p style="margin:20px 0; font-size:16px;">
            This OTP is valid for 5 minutes only. Do not share it with anyone.
            </p>

            <p style="margin:25px 0 0; font-size:14px; color:#555; text-align:center; font-style:italic;">
            If you did not request this OTP, please contact support immediately.
            </p>
        </td>
        </tr>

        <!-- Footer -->
        <tr>
        <td style="background:#f8f9fa; text-align:center; padding:20px; border-top:1px solid #e9ecef;">
            <p style="margin:0; font-size:12px; color:#6c757d;">© 2026 Loan Due Tracking System. All rights reserved.</p>
        </td>
        </tr>

    </table>
</body>
</html>
`;
};