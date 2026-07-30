export function EditIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="currentColor">
      <path opacity="0.25" d="M136,68l52,52L100,208H48V156Z"></path>
      <path d="M227.32,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.32,96a16,16,0,0,0,0-22.63ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.68,147.32,64l24-24L216,84.68Z"></path>
    </svg>
  );
}

export function DeleteIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="currentColor">
      <path opacity="0.25" d="M200,56V208a8,8,0,0,1-8,8H64a8,8,0,0,1-8-8V56Z"></path>
      <path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"></path>
    </svg>
  );
}

export function PlusIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="currentColor">
      <path opacity="0.25" d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z"></path>
      <path d="M176,120H136V80a8,8,0,0,0-16,0v40H80a8,8,0,0,0,0,16h40v40a8,8,0,0,0,16,0V136h40a8,8,0,0,0,0-16Z"></path>
      <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Z"></path>
    </svg>
  );
}

export function PdfIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="currentColor">
      <path opacity="0.25" d="M208,88H152V32Z"></path>
      <path d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z"></path>
    </svg>
  );
}

export function AttachIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="currentColor">
      <path
        opacity="0.25"
        d="M209.66,122.34l-82.05,82a56,56,0,0,1-79.2-79.2L147.68,25.54a36,36,0,0,1,50.92,50.92l-99.6,101a16,16,0,0,1-22.63-22.63l83.57-84.85Z"
      ></path>
      <path d="M209.66,122.34a8,8,0,0,1,0,11.32l-82.05,82a56,56,0,0,1-79.2-79.2L147.67,35.86a40,40,0,1,1,56.61,56.55L105,193A24,24,0,1,1,71,159L154.3,74.38A8,8,0,1,1,165.7,85.6L82.39,170.31a8,8,0,0,0,11.27,11.36L192.93,81A24,24,0,1,0,159,47.19L59.72,147.86a40,40,0,1,0,56.61,56.55l82.06-82A8,8,0,0,1,209.66,122.34Z"></path>
    </svg>
  );
}

export function CheckIcon({ size = 14, checked }: { size?: number; checked: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ opacity: checked ? 1 : 0, transform: checked ? "scale(1)" : "scale(0.65)", transition: "opacity .15s ease, transform .15s ease" }}>
      <path
        d="M4 12.6 L9.4 18 L20 6.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      ></path>
    </svg>
  );
}
