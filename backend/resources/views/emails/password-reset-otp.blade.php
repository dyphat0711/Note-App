<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Password Reset Code</title>
</head>
<body style="font-family: Arial, sans-serif; background:#f9fafb; padding:24px;">
    <div style="max-width:480px; margin:0 auto; background:#ffffff; border-radius:8px; padding:24px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <h1 style="font-size:20px; margin:0 0 16px; color:#111827;">Password Reset Code</h1>
        <p style="color:#374151;">Use the following one-time code to reset your password. The code is valid for <strong>{{ $expiresInMinutes }} minutes</strong>.</p>
        <div style="text-align:center; padding:16px; background:#f3f4f6; border-radius:6px; font-size:28px; letter-spacing:6px; font-weight:bold; color:#111827; margin:16px 0;">
            {{ $otp }}
        </div>
        <p style="color:#6b7280; font-size:14px;">If you did not request a password reset, you can safely ignore this email.</p>
        <p style="color:#6b7280; font-size:14px;">Thanks,<br>{{ config('app.name') }}</p>
    </div>
</body>
</html>
