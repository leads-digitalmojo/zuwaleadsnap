# MojoMap · Supabase Auth Email Templates
Official Digital Mojo BrandBook email templates for the Supabase Console.
Navigate to **Authentication > Email Templates** in your Supabase dashboard and paste these in.

---

## 1. Magic Link / OTP (Log In & 2FA Verification)
*Used for: 2FA security codes, One-Time Password logins, and Magic Link sign-ins.*

**Subject:**
```
{{ .Token }} is your MojoMap verification code
```

**HTML Body:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MojoMap Security Verification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f4ef; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111013;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f4ef; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 540px; background-color: #ffffff; border: 1px solid #e7e6e1; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(17, 16, 19, 0.06);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #111013; padding: 32px 32px 28px; text-align: center;">
              <!-- Mojo M Logo Mark -->
              <div style="display: inline-block; width: 44px; height: 44px; background-color: #19181c; border: 1px solid #2e2d35; border-radius: 12px; text-align: center; line-height: 44px; margin-bottom: 12px;">
                <svg width="26" height="26" viewBox="0 0 620 404" fill="none" style="vertical-align: middle;">
                  <ellipse cx="97" cy="300" rx="97" ry="92" fill="#FFE95C" />
                  <path d="M190 100 L330 300" stroke="#FFE95C" stroke-width="110" stroke-linecap="round" />
                  <path d="M425 100 L520 300" stroke="#FFE95C" stroke-width="110" stroke-linecap="round" />
                </svg>
              </div>
              <div style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em; line-height: 1.2;">
                Mojo<span style="color: #ffe95c;">Map</span>
              </div>
              <div style="font-size: 11px; font-weight: 600; color: #a4a2aa; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 4px;">
                Google Business Profile Geo-Grid Intelligence
              </div>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 36px 28px;">
              <h2 style="font-size: 18px; font-weight: 700; color: #111013; margin: 0 0 12px; letter-spacing: -0.01em;">
                Your Two-Factor Security Code
              </h2>
              <p style="font-size: 14px; color: #5a5960; line-height: 1.5; margin: 0 0 24px;">
                Use the 6-digit verification code below to complete your login to the MojoMap intelligence dashboard:
              </p>

              <!-- OTP Display Box -->
              <div style="background-color: #111013; border: 1px solid #2e2d35; border-radius: 8px; padding: 20px 24px; text-align: center; margin: 0 0 24px;">
                <span style="font-family: 'JetBrains Mono', Consolas, Monaco, monospace; font-size: 32px; font-weight: 800; letter-spacing: 12px; color: #ffe95c; display: inline-block; padding-left: 12px;">
                  {{ .Token }}
                </span>
              </div>

              <p style="font-size: 12.5px; color: #8e8d94; line-height: 1.5; margin: 0 0 24px; text-align: center;">
                This security code will expire in <strong>10 minutes</strong> and can only be used once.
              </p>

              <!-- Optional Direct Sign-In Link -->
              {{ if .ConfirmationURL }}
              <div style="text-align: center; margin-bottom: 28px;">
                <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #f0bc00; color: #111013; font-size: 13.5px; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 2px 8px rgba(240, 188, 0, 0.25);">
                  Instant Sign In &rarr;
                </a>
              </div>
              {{ end }}

              <!-- Notice Box -->
              <div style="background-color: #fff4d6; border: 1px solid #ebd48f; border-radius: 6px; padding: 12px 14px;">
                <p style="font-size: 12px; color: #7a4b00; margin: 0; line-height: 1.45;">
                  <strong>Security Alert:</strong> Never share this verification code with anyone. Digital Mojo staff will never ask for your code.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 36px 28px; background-color: #faf9f5; border-top: 1px solid #e7e6e1; text-align: center;">
              <p style="font-size: 11.5px; color: #8e8d94; margin: 0 0 6px;">
                Dispatched to <strong>{{ .Email }}</strong> for Digital Mojo Organization Members.
              </p>
              <p style="font-size: 11px; color: #b5b4b9; margin: 0;">
                MojoMap &bull; Digital Mojo Intelligence Platform &bull; Hyderabad, India
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 2. Confirm Sign-Up (New Account Verification)
*Used when: A team member signs up with their `@digitalmojo.in` email and password.*

**Subject:**
```
Confirm your MojoMap account
```

**HTML Body:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Your MojoMap Account</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f4ef; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111013;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f4ef; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 540px; background-color: #ffffff; border: 1px solid #e7e6e1; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(17, 16, 19, 0.06);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #111013; padding: 32px 32px 28px; text-align: center;">
              <div style="display: inline-block; width: 44px; height: 44px; background-color: #19181c; border: 1px solid #2e2d35; border-radius: 12px; text-align: center; line-height: 44px; margin-bottom: 12px;">
                <svg width="26" height="26" viewBox="0 0 620 404" fill="none" style="vertical-align: middle;">
                  <ellipse cx="97" cy="300" rx="97" ry="92" fill="#FFE95C" />
                  <path d="M190 100 L330 300" stroke="#FFE95C" stroke-width="110" stroke-linecap="round" />
                  <path d="M425 100 L520 300" stroke="#FFE95C" stroke-width="110" stroke-linecap="round" />
                </svg>
              </div>
              <div style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">
                Mojo<span style="color: #ffe95c;">Map</span>
              </div>
              <div style="font-size: 11px; font-weight: 600; color: #a4a2aa; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 4px;">
                Account Registration
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 36px 36px 28px;">
              <h2 style="font-size: 18px; font-weight: 700; color: #111013; margin: 0 0 12px;">
                Welcome to MojoMap!
              </h2>
              <p style="font-size: 14px; color: #5a5960; line-height: 1.5; margin: 0 0 24px;">
                Your organization account has been created for <strong>{{ .Email }}</strong>. Click the button below to verify your email address and activate your GBP Geo-Grid rank tracker access:
              </p>

              <div style="text-align: center; margin: 28px 0;">
                <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #f0bc00; color: #111013; font-size: 14px; font-weight: 700; text-decoration: none; padding: 13px 32px; border-radius: 8px; box-shadow: 0 2px 8px rgba(240, 188, 0, 0.25);">
                  Confirm Email Address &rarr;
                </a>
              </div>

              {{ if .Token }}
              <div style="background-color: #faf9f5; border: 1px solid #e7e6e1; border-radius: 8px; padding: 16px; text-align: center; margin-top: 24px;">
                <div style="font-size: 12px; color: #727078; margin-bottom: 6px;">Or enter this confirmation code manually:</div>
                <div style="font-family: 'JetBrains Mono', Consolas, Monaco, monospace; font-size: 22px; font-weight: 700; letter-spacing: 4px; color: #111013;">
                  {{ .Token }}
                </div>
              </div>
              {{ end }}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 36px 28px; background-color: #faf9f5; border-top: 1px solid #e7e6e1; text-align: center;">
              <p style="font-size: 11.5px; color: #8e8d94; margin: 0 0 6px;">
                Sent to <strong>{{ .Email }}</strong> &bull; Digital Mojo Organization Access Only.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 3. Reset Password / Recovery
*Used when: A team member requests a password reset.*

**Subject:**
```
Reset your MojoMap password
```

**HTML Body:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f4ef; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111013;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f4ef; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 540px; background-color: #ffffff; border: 1px solid #e7e6e1; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(17, 16, 19, 0.06);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #111013; padding: 32px 32px 28px; text-align: center;">
              <div style="display: inline-block; width: 44px; height: 44px; background-color: #19181c; border: 1px solid #2e2d35; border-radius: 12px; text-align: center; line-height: 44px; margin-bottom: 12px;">
                <svg width="26" height="26" viewBox="0 0 620 404" fill="none" style="vertical-align: middle;">
                  <ellipse cx="97" cy="300" rx="97" ry="92" fill="#FFE95C" />
                  <path d="M190 100 L330 300" stroke="#FFE95C" stroke-width="110" stroke-linecap="round" />
                  <path d="M425 100 L520 300" stroke="#FFE95C" stroke-width="110" stroke-linecap="round" />
                </svg>
              </div>
              <div style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">
                Mojo<span style="color: #ffe95c;">Map</span>
              </div>
              <div style="font-size: 11px; font-weight: 600; color: #a4a2aa; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 4px;">
                Password Recovery
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 36px 36px 28px;">
              <h2 style="font-size: 18px; font-weight: 700; color: #111013; margin: 0 0 12px;">
                Reset Your Password
              </h2>
              <p style="font-size: 14px; color: #5a5960; line-height: 1.5; margin: 0 0 24px;">
                We received a request to reset the password for <strong>{{ .Email }}</strong>. Click below to establish a new password:
              </p>

              <div style="text-align: center; margin: 28px 0;">
                <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #f0bc00; color: #111013; font-size: 14px; font-weight: 700; text-decoration: none; padding: 13px 32px; border-radius: 8px; box-shadow: 0 2px 8px rgba(240, 188, 0, 0.25);">
                  Set New Password &rarr;
                </a>
              </div>

              {{ if .Token }}
              <div style="background-color: #faf9f5; border: 1px solid #e7e6e1; border-radius: 8px; padding: 16px; text-align: center; margin-top: 24px;">
                <div style="font-size: 12px; color: #727078; margin-bottom: 6px;">Or use this recovery token:</div>
                <div style="font-family: 'JetBrains Mono', Consolas, Monaco, monospace; font-size: 22px; font-weight: 700; letter-spacing: 4px; color: #111013;">
                  {{ .Token }}
                </div>
              </div>
              {{ end }}

              <p style="font-size: 12.5px; color: #8e8d94; line-height: 1.5; margin: 24px 0 0;">
                If you did not request a password reset, you can safely ignore this email — your account remains completely secure.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 36px 28px; background-color: #faf9f5; border-top: 1px solid #e7e6e1; text-align: center;">
              <p style="font-size: 11.5px; color: #8e8d94; margin: 0;">
                Sent to <strong>{{ .Email }}</strong> &bull; MojoMap Security &bull; Digital Mojo
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 4. Invite User
*Used when: An admin invites a team member directly from the Supabase dashboard.*

**Subject:**
```
You've been invited to MojoMap (@digitalmojo.in)
```

**HTML Body:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MojoMap Invitation</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f4ef; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111013;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f4ef; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 540px; background-color: #ffffff; border: 1px solid #e7e6e1; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(17, 16, 19, 0.06);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #111013; padding: 32px 32px 28px; text-align: center;">
              <div style="display: inline-block; width: 44px; height: 44px; background-color: #19181c; border: 1px solid #2e2d35; border-radius: 12px; text-align: center; line-height: 44px; margin-bottom: 12px;">
                <svg width="26" height="26" viewBox="0 0 620 404" fill="none" style="vertical-align: middle;">
                  <ellipse cx="97" cy="300" rx="97" ry="92" fill="#FFE95C" />
                  <path d="M190 100 L330 300" stroke="#FFE95C" stroke-width="110" stroke-linecap="round" />
                  <path d="M425 100 L520 300" stroke="#FFE95C" stroke-width="110" stroke-linecap="round" />
                </svg>
              </div>
              <div style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">
                Mojo<span style="color: #ffe95c;">Map</span>
              </div>
              <div style="font-size: 11px; font-weight: 600; color: #a4a2aa; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 4px;">
                Team Member Invitation
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 36px 36px 28px;">
              <h2 style="font-size: 18px; font-weight: 700; color: #111013; margin: 0 0 12px;">
                Join the MojoMap Workspace
              </h2>
              <p style="font-size: 14px; color: #5a5960; line-height: 1.5; margin: 0 0 24px;">
                You have been invited to access the <strong>MojoMap</strong> GBP rank tracking and geo-grid intelligence platform for <strong>{{ .Email }}</strong>. Click below to accept your invitation:
              </p>

              <div style="text-align: center; margin: 28px 0;">
                <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #f0bc00; color: #111013; font-size: 14px; font-weight: 700; text-decoration: none; padding: 13px 32px; border-radius: 8px; box-shadow: 0 2px 8px rgba(240, 188, 0, 0.25);">
                  Accept Invitation &rarr;
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 36px 28px; background-color: #faf9f5; border-top: 1px solid #e7e6e1; text-align: center;">
              <p style="font-size: 11.5px; color: #8e8d94; margin: 0;">
                Digital Mojo Intelligence Platform &bull; Hyderabad, India
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```
