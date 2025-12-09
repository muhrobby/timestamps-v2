import { uploadQueueProcessor } from "../utils/google-drive";

export default defineNitroPlugin(() => {
  // Start the upload queue processor when the server starts
  uploadQueueProcessor.start();

  console.log("✅ Upload queue processor started");
});
