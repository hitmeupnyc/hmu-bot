const styles = `
html {
  font-size: 24px;
  font-family: sans-serif;
  color: white;
  background-color: rgb(0, 0, 0);
}

body {
  margin: auto;
  max-width: 30rem;
}

code {
  font-size: 0.75rem;
  font-family: monospace;
}

img {
  display: block;
  margin: 0 auto;
}

button {
  cursor: pointer;
  font-size: 0.75rem;
  padding: 0.5rem 1rem;
  background-color: rgb(40, 40, 40);
  color: white;
  border: none;
  border-radius: 0.5rem;
}
button:hover {

}

input {
  padding: 0.25rem;
  font-size: 1rem;
  min-width: 20rem;
  border-radius: 0.25rem;
  border: none;
}
`;

export const layout = (children: string) => `<html>
  <head>
    <title>Gloss Discord community</title>
    <style>${styles}</style>
  </head>
  <body>
    <img width="200" height="200" src="https://images.squarespace-cdn.com/content/v1/6625cf710ccb91746bb54d9d/f6611066-7bf0-40fe-b295-f40fb97c0048/Gloss+Logo+-+White.png" />
    ${children}
  </body>
</html>`;

export const success = () => {
  return layout(`
<p>Your email was found in the list of approved members!</p>
<p>Welcome to the Gloss Discord ✨ You're all set, you can close this window.</p>
`);
};
