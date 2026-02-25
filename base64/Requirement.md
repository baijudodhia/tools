Below is a **production-ready Cursor prompt** to generate a **standalone, frontend-only Base64 encoder/decoder tool** using **TailwindCSS (CDN)** and browser APIs only.

---

## Cursor Prompt

Build a **standalone frontend-only Base64 Encoder/Decoder web application** using:

* Plain HTML + Vanilla JavaScript
* TailwindCSS via CDN
* No backend
* No build tools
* No framework
* Everything must work from a single `index.html` file

---

### Core Requirements

Create a professional-grade Base64 utility that supports:

#### 1. Text Encoding/Decoding

* UTF-8 safe encoding
* Handle emojis and special characters
* Encode text → Base64
* Decode Base64 → Text
* Proper error handling for invalid Base64 input

#### 2. File Encoding

* Upload any file type (image, pdf, zip, json, txt, etc.)
* Convert file → Base64
* Display:

  * Full Base64
  * Data URL format
  * Raw Base64 (without mime prefix)
* Show file metadata:

  * Name
  * Type
  * Size (formatted)
* Copy Base64 to clipboard
* Download Base64 as `.txt`

#### 3. Base64 → File Conversion

* Paste Base64 string
* Detect if Data URL or raw Base64
* Extract MIME type if present
* Reconstruct file
* Allow file download
* Show preview if:

  * Image
  * PDF
  * Text
  * JSON

#### 4. Advanced Utilities

* Remove whitespace from Base64
* Auto-detect malformed input
* Validate Base64 string
* Convert Base64 ↔ Blob
* Convert Base64 ↔ ArrayBuffer
* Convert Base64 ↔ JSON

---

### UI/UX Requirements

Use TailwindCSS CDN.

Create a clean professional layout with:

* Header section
* Tab navigation:

  * Text
  * File → Base64
  * Base64 → File
  * Utilities
* Responsive layout
* Dark mode toggle (using Tailwind classes only)
* Toast notifications (pure JS, no libraries)
* Copy buttons with visual feedback
* Drag & drop file upload
* Loading indicators for large files

Use modern UI patterns:

* Card-based layout
* Proper spacing
* Rounded corners
* Subtle shadows
* Smooth transitions
* Focus states
* Accessible labels

---

### Technical Implementation Requirements

#### Encoding

Use:

* `TextEncoder`
* `TextDecoder`
* `btoa`
* `atob`
* FileReader
* Blob
* URL.createObjectURL

Ensure:

* UTF-8 safe Base64 encoding
* Handle large files without freezing UI
* Use async patterns

---

### Performance Requirements

* Efficient memory handling
* Avoid unnecessary DOM re-renders
* Handle files up to at least 50MB safely
* Gracefully fail for very large files

---

### Security

* No external data transmission
* No third-party trackers
* Everything runs client-side only
* Show notice: “All processing happens locally in your browser.”

---

### Additional Features (Optional but Preferred)

* Base64 size calculator
* Show percentage size increase
* Auto-detect MIME type
* Pretty-print JSON if decoded content is JSON
* History panel (in-memory only)
* Keyboard shortcuts
* Clear all button
* Download decoded text as file

---

### Code Quality Requirements

* Modular JS functions
* Clear function separation:

  * encodeText()
  * decodeText()
  * fileToBase64()
  * base64ToFile()
  * validateBase64()
  * showToast()
* No inline JS
* Use `<script>` block at bottom
* Comment important logic
* Production-ready code
* No placeholder logic

---

### Deliverables

Return:

1. Full working `index.html`
2. All JS embedded inside `<script>`
3. TailwindCSS via CDN
4. Clean structured code
5. Fully functional tool

Do not skip any required functionality.

The output must be directly usable by opening the HTML file in a browser.

---

If you'd like, I can now generate the complete production-ready HTML implementation.
