const STORAGE_KEY = "smash-kameti-theme";

const script = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");var d=t!=="light";document.documentElement.classList.toggle("dark",d);document.documentElement.classList.toggle("light",!d);}catch(e){}})();`;

export function ThemeInitScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
