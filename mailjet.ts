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
            Email: "hello@hitmeupnyc.com",
            Name: "Hit Me Up community",
          },
          To: [
            {
              Email: recipient,
              Name: "HMU Member",
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
