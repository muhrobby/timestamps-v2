import { google } from "googleapis";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  const checks = {
    serviceAccount: {
      email: !!config.googleServiceAccountEmail,
      emailValue: config.googleServiceAccountEmail || null,
      privateKey: !!config.googleServiceAccountPrivateKey,
      privateKeyLength: config.googleServiceAccountPrivateKey?.length || 0,
    },
    oauth2: {
      clientId: !!config.googleClientId,
      clientSecret: !!config.googleClientSecret,
      refreshToken: !!config.googleRefreshToken,
    },
    common: {
      folderId: config.googleDriveFolderId || null,
      hasFolderId: !!config.googleDriveFolderId,
    },
  };

  // Test authentication
  let authTest = {
    success: false,
    method: null as string | null,
    error: null as string | null,
  };

  try {
    // Try Service Account
    if (
      config.googleServiceAccountEmail &&
      config.googleServiceAccountPrivateKey
    ) {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: config.googleServiceAccountEmail,
          private_key: config.googleServiceAccountPrivateKey.replace(
            /\\n/g,
            "\n"
          ),
        },
        scopes: ["https://www.googleapis.com/auth/drive.file"],
      });

      const drive = google.drive({ version: "v3", auth });

      // Test API call - list files in folder
      if (config.googleDriveFolderId) {
        await drive.files.list({
          q: `'${config.googleDriveFolderId}' in parents and trashed=false`,
          pageSize: 1,
          fields: "files(id, name)",
        });
        authTest = {
          success: true,
          method: "Service Account",
          error: null,
        };
      } else {
        authTest = {
          success: false,
          method: "Service Account",
          error: "GOOGLE_DRIVE_FOLDER_ID not configured",
        };
      }
    }
    // Try OAuth2
    else if (
      config.googleClientId &&
      config.googleClientSecret &&
      config.googleRefreshToken
    ) {
      const oauth2Client = new google.auth.OAuth2(
        config.googleClientId,
        config.googleClientSecret
      );

      oauth2Client.setCredentials({
        refresh_token: config.googleRefreshToken,
      });

      const drive = google.drive({ version: "v3", auth: oauth2Client });

      if (config.googleDriveFolderId) {
        await drive.files.list({
          q: `'${config.googleDriveFolderId}' in parents and trashed=false`,
          pageSize: 1,
          fields: "files(id, name)",
        });
        authTest = {
          success: true,
          method: "OAuth2",
          error: null,
        };
      } else {
        authTest = {
          success: false,
          method: "OAuth2",
          error: "GOOGLE_DRIVE_FOLDER_ID not configured",
        };
      }
    } else {
      authTest = {
        success: false,
        method: null,
        error: "No credentials configured",
      };
    }
  } catch (error: any) {
    authTest = {
      success: false,
      method: authTest.method,
      error: error.message || "Unknown error",
    };
  }

  return {
    timestamp: new Date().toISOString(),
    configuration: checks,
    authentication: authTest,
    recommendations: generateRecommendations(checks, authTest),
  };
});

function generateRecommendations(checks: any, authTest: any): string[] {
  const recommendations: string[] = [];

  if (!authTest.success) {
    if (!checks.serviceAccount.email && !checks.oauth2.clientId) {
      recommendations.push(
        "❌ No Google Drive credentials configured. Please set up Service Account or OAuth2."
      );
    }

    if (authTest.error?.includes("Insufficient Permission")) {
      recommendations.push(
        `❌ Permission denied. Share the folder with: ${checks.serviceAccount.emailValue}`
      );
    }

    if (authTest.error?.includes("not found")) {
      recommendations.push(
        "❌ Folder not found. Check GOOGLE_DRIVE_FOLDER_ID in .env.local"
      );
    }

    if (!checks.common.hasFolderId) {
      recommendations.push(
        "❌ GOOGLE_DRIVE_FOLDER_ID not configured in .env.local"
      );
    }
  } else {
    recommendations.push(
      `✅ Google Drive connection successful using ${authTest.method}`
    );
  }

  return recommendations;
}
