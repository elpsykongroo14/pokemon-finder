// A single, deliberate chokepoint for turning untrusted strings into text that's safe to interpolate into innerHTML.
//
// Why this exists: innerHTML doesn't know the difference between "text I want displayed" and "markup I want executed." If a string contains something like <img src=x onerror="...">, innerHTML will happily create that element and run it. escapeHTML neutralizes that by converting the characters that give HTML its meaning (<, >, &, ", ') into their inert text equivalents (&lt;, &gt;, etc.) before the string ever reaches innerHTML.
//
// The trick: we never write our own escaping table. We let the browser do it. Setting .textContent on an element is ALWAYS safe — the browser treats it as plain text no matter what's inside it. So we hand the untrusted string to a throwaway <div> via textContent, then read the same content back out via .innerHTML. Reading .innerHTML back out gives us the escaped version, because the div's content is a text node, and serializing a text node back to HTML is exactly what "escaping" means.
export function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  //the textContent -> innerHTML round trip escapes <> & for us but not quote characters quotes only matter inside an attribute value and as far as the browser is concerned,
  //a text node isnt one. several of our call sites interpolate straight into attributes (alt="...", src="...") where an unescpaed " could close the attribute early and let an attacker inject a new one
  //(e.g. onerror=) so we can escape quotes ourselves on top of what the browser gives us for free.
  return div.innerHTML.replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
