const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/drive.file",
  "openid",
  "email",
  "profile",
].join(" ");
const API_BASE = "./api";

const state = {
  imageDataUrl: "",
  oauthToken: "",
  tokenClient: null,
  googleClientId: "",
  googleScriptPromise: null,
  deferredInstallPrompt: null,
  toastTimer: null,
};

const elements = {
  installButton: document.querySelector("#install-button"),
  toast: document.querySelector("#toast"),
  cameraImageInput: document.querySelector("#camera-image-input"),
  libraryImageInput: document.querySelector("#library-image-input"),
  previewCard: document.querySelector("#preview-card"),
  previewImage: document.querySelector("#preview-image"),
  uploadFeedback: document.querySelector("#upload-feedback"),
  transcribeFeedback: document.querySelector("#transcribe-feedback"),
  resetImage: document.querySelector("#reset-image"),
  transcribeButton: document.querySelector("#transcribe-button"),
  transcriptOutput: document.querySelector("#transcript-output"),
  googleAuthButton: document.querySelector("#google-auth-button"),
  googleSignoutButton: document.querySelector("#google-signout-button"),
  googleSessionLabel: document.querySelector("#google-session-label"),
  googleFeedback: document.querySelector("#google-feedback"),
  copyTextButton: document.querySelector("#copy-text-button"),
  saveDocButton: document.querySelector("#save-doc-button"),
  saveFeedback: document.querySelector("#save-feedback"),
  docTitle: document.querySelector("#doc-title"),
  docLinkWrap: document.querySelector("#doc-link-wrap"),
  docLink: document.querySelector("#doc-link"),
};

document.addEventListener("DOMContentLoaded", async () => {
  bindEvents();
  registerServiceWorker();
  syncInstallButtonVisibility();
  setDefaultTitle();
  refreshActionState();
  await loadPublicConfig();
});

function bindEvents() {
  elements.cameraImageInput.addEventListener("change", handleImageSelection);
  elements.libraryImageInput.addEventListener("change", handleImageSelection);
  elements.resetImage.addEventListener("click", resetSelectedImage);
  elements.transcribeButton.addEventListener("click", transcribeImage);
  elements.googleAuthButton.addEventListener("click", requestGoogleToken);
  elements.googleSignoutButton.addEventListener("click", signOutGoogle);
  elements.copyTextButton.addEventListener("click", copyTranscriptText);
  elements.saveDocButton.addEventListener("click", saveToGoogleDocs);
  elements.installButton.addEventListener("click", promptInstall);
  elements.transcriptOutput.addEventListener("input", refreshActionState);

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.deferredInstallPrompt = event;
    syncInstallButtonVisibility();
  });

  window.addEventListener("appinstalled", () => {
    state.deferredInstallPrompt = null;
    syncInstallButtonVisibility();
  });
}

async function loadPublicConfig() {
  try {
    const response = await fetch(`${API_BASE}/config`);

    if (!response.ok) {
      throw new Error("Config request failed.");
    }

    const config = await response.json();
    state.googleClientId = config.googleClientId || "";

    if (!state.googleClientId) {
      setInlineFeedback(elements.googleFeedback, "Google sign-in is not ready yet for this app.", "warning");
      return;
    }
  } catch (error) {
    console.error(error);
    showToast("The app could not finish loading. Try refreshing the page.", "error");
  }
}

async function handleImageSelection(event) {
  const [file] = event.target.files || [];

  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    setUploadFeedback("Please choose an image file.", "error");
    showToast("Please choose an image file.", "error");
    return;
  }

  const fileName = file.name || "Selected image";
  const lowerName = fileName.toLowerCase();
  const looksLikeHeic =
    lowerName.endsWith(".heic") ||
    lowerName.endsWith(".heif") ||
    file.type === "image/heic" ||
    file.type === "image/heif";

  setUploadFeedback(`Preparing ${fileName} for preview and transcription...`, "info");

  try {
    state.imageDataUrl = await normalizeImageForUpload(file);
    elements.previewImage.src = state.imageDataUrl;
    elements.previewCard.classList.remove("empty");
    elements.resetImage.disabled = false;
    hideDocLink();
    clearTranscribeFeedback();
    refreshActionState();
    setUploadFeedback(`${fileName} is ready.`, "success");
  } catch (error) {
    console.error(error);
    resetSelectedImage({ silent: true });
    const message = looksLikeHeic
      ? "This HEIC image could not be opened by the browser. Convert it to JPG or PNG first, or change your iPhone camera setting to Most Compatible."
      : "This image could not be opened by the browser. Try a JPG or PNG version instead.";
    setUploadFeedback(message, "error");
    showToast(message, "error");
  }
}

function resetSelectedImage(options = {}) {
  state.imageDataUrl = "";
  elements.cameraImageInput.value = "";
  elements.libraryImageInput.value = "";
  elements.previewImage.removeAttribute("src");
  elements.previewCard.classList.add("empty");
  elements.resetImage.disabled = true;
  hideDocLink();
  refreshActionState();
  clearUploadFeedback();
  clearTranscribeFeedback();
  clearInlineFeedback(elements.saveFeedback);

  if (!options.silent) {
    showToast("Image removed.", "info");
  }
}

async function transcribeImage() {
  if (!state.imageDataUrl) {
    setTranscribeFeedback("Add a note image before transcribing.", "warning");
    showToast("Add a note image before transcribing.", "warning");
    return;
  }

  setBusy(elements.transcribeButton, true, "Reading handwriting...");
  setTranscribeFeedback("Reading your note...", "info");

  try {
    const response = await fetch(`${API_BASE}/transcribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageDataUrl: state.imageDataUrl,
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Transcription failed.");
    }

    elements.transcriptOutput.value = payload.text || "";
    elements.transcriptOutput.focus();
    elements.transcriptOutput.setSelectionRange(0, 0);
    elements.transcriptOutput.scrollIntoView({ behavior: "smooth", block: "start" });
    refreshActionState();
    setTranscribeFeedback("Your note was transcribed.", "success");
    showToast("Transcription complete.", "success");
  } catch (error) {
    console.error(error);
    const message = simplifyTranscriptionError(error);
    setTranscribeFeedback(message, "error");
    showToast(message, "error");
  } finally {
    setBusy(elements.transcribeButton, false, "Transcribe handwriting");
  }
}

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  if (state.googleScriptPromise) {
    return state.googleScriptPromise;
  }

  state.googleScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google sign-in failed to load."));
    document.head.append(script);
  });

  return state.googleScriptPromise;
}

async function initGoogleTokenClient() {
  if (!state.googleClientId) {
    throw new Error("Google sign-in is not available right now.");
  }

  await loadGoogleIdentityScript();

  if (!window.google?.accounts?.oauth2) {
    throw new Error("Google sign-in is still loading. Try again in a moment.");
  }

  if (!state.tokenClient) {
    state.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: state.googleClientId,
      scope: GOOGLE_SCOPES,
      callback: handleGoogleAuthResponse,
    });
  }

  return state.tokenClient;
}

async function requestGoogleToken() {
  if (!state.googleClientId) {
    setInlineFeedback(elements.googleFeedback, "Google sign-in is not available right now.", "warning");
    showToast("Google sign-in is not available right now.", "warning");
    return;
  }

  try {
    setBusy(elements.googleAuthButton, true, "Loading Google...");
    const tokenClient = await initGoogleTokenClient();
    clearInlineFeedback(elements.googleFeedback);
    tokenClient.requestAccessToken({
      prompt: state.oauthToken ? "" : "consent",
    });
  } catch (error) {
    console.error(error);
    const message = error?.message || "Google sign-in is still loading. Try again in a moment.";
    setInlineFeedback(elements.googleFeedback, message, "warning");
    showToast(message, "warning");
  } finally {
    setBusy(
      elements.googleAuthButton,
      false,
      state.oauthToken ? "Reconnect Google" : "Sign in with Google",
    );
  }
}

function handleGoogleAuthResponse(response) {
  if (response.error) {
    console.error(response);
    setInlineFeedback(elements.googleFeedback, "Google sign-in was cancelled or failed.", "error");
    showToast("Google sign-in was cancelled or failed.", "error");
    return;
  }

  state.oauthToken = response.access_token;
  elements.googleSessionLabel.textContent = "Google connected";
  elements.googleAuthButton.textContent = "Reconnect Google";
  elements.googleSignoutButton.disabled = false;
  setInlineFeedback(elements.googleFeedback, "Signed in to Google Docs.", "success");
  refreshActionState();
  showToast("Signed in with Google.", "success");
}

function signOutGoogle() {
  if (state.oauthToken && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(state.oauthToken, () => {});
  }

  state.oauthToken = "";
  elements.googleSessionLabel.textContent = "Not signed in";
  elements.googleAuthButton.textContent = "Sign in with Google";
  elements.googleSignoutButton.disabled = true;
  clearInlineFeedback(elements.googleFeedback);
  refreshActionState();
  showToast("You signed out of Google.", "info");
}

async function saveToGoogleDocs() {
  const transcript = elements.transcriptOutput.value.trim();

  if (!transcript) {
    setInlineFeedback(elements.saveFeedback, "Add text before saving to Google Docs.", "warning");
    showToast("Add text before saving to Google Docs.", "warning");
    return;
  }

  if (!state.oauthToken) {
    setInlineFeedback(elements.googleFeedback, "Sign in with Google before saving.", "warning");
    showToast("Sign in with Google before saving.", "warning");
    return;
  }

  setBusy(elements.saveDocButton, true, "Creating Google Doc...");
  setInlineFeedback(elements.saveFeedback, "Saving your note to Google Docs...", "info");

  try {
    const title = elements.docTitle.value.trim() || "Transcribed Note";

    const createResponse = await fetch("https://docs.googleapis.com/v1/documents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${state.oauthToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title }),
    });

    if (!createResponse.ok) {
      throw new Error(await createResponse.text());
    }

    const documentData = await createResponse.json();
    const documentId = documentData.documentId;

    const updateResponse = await fetch(
      `https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${state.oauthToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [
            {
              insertText: {
                location: { index: 1 },
                text: transcript,
              },
            },
          ],
        }),
      },
    );

    if (!updateResponse.ok) {
      throw new Error(await updateResponse.text());
    }

    const docUrl = `https://docs.google.com/document/d/${documentId}/edit`;
    elements.docLink.href = docUrl;
    elements.docLinkWrap.classList.remove("hidden");
    setInlineFeedback(elements.saveFeedback, "Your Google Doc is ready.", "success");
    showToast("Saved to Google Docs.", "success");
  } catch (error) {
    console.error(error);
    const message = simplifyGoogleDocsError(error);
    setInlineFeedback(elements.saveFeedback, message, "error");
    showToast(message, "error");
  } finally {
    setBusy(elements.saveDocButton, false, "Save to Google Docs");
  }
}

function refreshActionState() {
  elements.transcribeButton.disabled = !state.imageDataUrl;
  elements.copyTextButton.disabled = !elements.transcriptOutput.value.trim();
  elements.saveDocButton.disabled = !(elements.transcriptOutput.value.trim() && state.oauthToken);
}

async function copyTranscriptText() {
  const transcript = elements.transcriptOutput.value.trim();

  if (!transcript) {
    setTranscribeFeedback("There is no text to copy yet.", "warning");
    showToast("There is no text to copy yet.", "warning");
    return;
  }

  try {
    await navigator.clipboard.writeText(transcript);
    showToast("Text copied.", "success");
  } catch (error) {
    console.error(error);
    showToast("Copy failed. You can still select the text manually.", "error");
  }
}

function setBusy(button, isBusy, label) {
  button.disabled = isBusy;
  button.textContent = label;
}

function setDefaultTitle() {
  const stamp = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  elements.docTitle.value = `Transcribed Note - ${stamp}`;
}

function hideDocLink() {
  elements.docLink.href = "#";
  elements.docLinkWrap.classList.add("hidden");
}

function setUploadFeedback(message, tone = "info") {
  setInlineFeedback(elements.uploadFeedback, message, tone);
}

function clearUploadFeedback() {
  clearInlineFeedback(elements.uploadFeedback);
}

function setTranscribeFeedback(message, tone = "info") {
  setInlineFeedback(elements.transcribeFeedback, message, tone);
}

function clearTranscribeFeedback() {
  clearInlineFeedback(elements.transcribeFeedback);
}

function simplifyTranscriptionError(error) {
  const raw = String(error?.message || "");

  if (/api key|permission|unauthorized|forbidden|auth/i.test(raw)) {
    return "The app could not connect to the note-reading service. Please check the app setup.";
  }

  if (/quota|rate limit|resource exhausted|429/i.test(raw)) {
    return "The note-reading service is busy right now. Please try again in a moment.";
  }

  if (/model/i.test(raw)) {
    return "The app could not use the note-reading model. Please check the app setup.";
  }

  return "We couldn't read that note. Try a clearer photo or a different image.";
}

function simplifyGoogleDocsError(error) {
  const raw = String(error?.message || "");

  if (/docs api has not been used|docs\.googleapis\.com|service_disabled/i.test(raw)) {
    return "Google Docs is not turned on for this app yet. Please enable the Google Docs API in Google Cloud, wait a few minutes, and try again.";
  }

  if (/drive api has not been used|drive\.googleapis\.com/i.test(raw)) {
    return "Google Drive is not turned on for this app yet. Please enable the Google Drive API in Google Cloud, wait a few minutes, and try again.";
  }

  if (/insufficient|permission|forbidden|403/i.test(raw)) {
    return "This app doesn't have permission to save to Google Docs right now. Try signing in again.";
  }

  return "We couldn't save to Google Docs. Please try again.";
}

function setInlineFeedback(element, message, tone = "info") {
  element.textContent = message;
  element.className = `upload-feedback ${tone}`;
}

function clearInlineFeedback(element) {
  element.textContent = "";
  element.className = "upload-feedback hidden";
}

function showToast(message, tone = "info") {
  if (!message) {
    return;
  }

  if (state.toastTimer) {
    clearTimeout(state.toastTimer);
  }

  elements.toast.textContent = message;
  elements.toast.className = `toast ${tone}`;

  state.toastTimer = window.setTimeout(() => {
    elements.toast.textContent = "";
    elements.toast.className = "toast hidden";
    state.toastTimer = null;
  }, 3200);
}

async function normalizeImageForUpload(file) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImageElement(objectUrl);
    return renderImageToJpegDataUrl(image);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image decode failed."));
    image.src = src;
  });
}

function renderImageToJpegDataUrl(image) {
  const canvas = document.createElement("canvas");
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;

  if (!width || !height) {
    throw new Error("Image dimensions are unavailable.");
  }

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas rendering is unavailable.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", 0.92);
}

function promptInstall() {
  if (!state.deferredInstallPrompt) {
    return;
  }

  state.deferredInstallPrompt.prompt();
  state.deferredInstallPrompt.userChoice.finally(() => {
    state.deferredInstallPrompt = null;
    syncInstallButtonVisibility();
  });
}

function isInstalledApp() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function syncInstallButtonVisibility() {
  const shouldShow = Boolean(state.deferredInstallPrompt) && !isInstalledApp();
  elements.installButton.classList.toggle("hidden", !shouldShow);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("sw.js");
    } catch (error) {
      console.error("Service worker registration failed:", error);
    }
  });
}
