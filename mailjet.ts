export const sendEmail = async (
  recipient: string,
  code: string,
  mjAuth: string,
) => {
  const req = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${btoa(mjAuth)}`,
    },
    body: JSON.stringify({
      Messages: [
        {
          From: {
            Email: "admin@glossgroup.nyc",
            Name: "Gloss Group NYC",
          },
          To: [
            {
              Email: recipient,
              Name: "Gloss Member",
            },
          ],
          Subject: "Your confirmation code!",
          TextPart: `Your confirmation code is ${code}. It expires in 5 minutes.`,
        },
      ],
    }),
  };
  const res = await fetch("https://api.mailjet.com/v3.1/send", req);

  console.log("MAILJET", res.ok, res.status, JSON.stringify(await res.json()));
  return res;
};
