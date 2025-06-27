const styles = `
html {
  font-size: 24px;
  font-family: sans-serif;
  color: white;
  background-color: rgb(138, 71, 255);
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
  background-color: rgb(118, 61, 217);
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
    <title>HMU Discord community</title>
    <style>${styles}</style>
  </head>
  <body>
    <img width="200" height="200" src="https://images.squarespace-cdn.com/content/v1/6424111cd19b7922f0e81e49/9b7ff4f6-7192-4dd6-a7db-9409edda7c9b/HMU.png?format=1500w" />
    ${children}
  </body>
</html>`;

export const success = () => {
  return layout(`
<p>Your email was found in the list of approved members!</p>
<p>Welcome to the HMU Discord ✨ You're all set, you can close this window.</p>
`);
};

