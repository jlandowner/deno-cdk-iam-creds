import { encodeBase64 } from "https://deno.land/std@0.215.0/encoding/base64.ts";
import { stringify } from "https://deno.land/std@0.215.0/yaml/mod.ts";
import { getIAMCredentialSecretByStack } from "https://raw.githubusercontent.com/jlandowner/deno-cdk-iam-creds/main/mod.ts";

const secret = await getIAMCredentialSecretByStack(Deno.args[0] || "IAMUserStack");
const name = Deno.args[1] || "aws-credentials-secret";

const b64AccessKey = encodeBase64(secret.AWS_ACCESS_KEY_ID);
const b64SecretAccessKey = encodeBase64(secret.AWS_SECRET_ACCESS_KEY);

const sec = stringify({
  apiVersion: "v1",
  kind: "Secret",
  metadata: {
    name: name,
  },
  data: {
    AWS_ACCESS_KEY_ID: b64AccessKey,
    AWS_SECRET_ACCESS_KEY: b64SecretAccessKey,
  },
});

console.log(sec);
