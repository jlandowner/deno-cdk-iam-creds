# Deno AWS CDK for IAM User credentials

Create IAM User credentails in a secure way by AWS CDK with Deno.

## How to use

Bootstrap a CDK using Deno.

```sh
# Bootstrap a CDK using Deno
alias cdk="deno run -A npm:aws-cdk"
export AWS_REGION=ap-northeast-1
cdk bootstrap
```

Create a IAM User and generate access key.
(remove `-A` option for a secure execution)

```sh
# Configure example cdk app
CDK_IAM_USER='deno run -A https://raw.githubusercontent.com/jlandowner/deno-cdk-iam-creds/main/cdk.ts'

# Create a default IAM User and generate access key.
cdk --app "$CDK_IAM_USER" deploy

# Retreive the secerts from Secrets Manager.
deno run -A https://raw.githubusercontent.com/jlandowner/deno-cdk-iam-creds/main/mod.ts
```

The output like this.

```
{
  "AWS_ACCESS_KEY_ID": "xxxxxxxxxxxxxxx",
  "AWS_SECRET_ACCESS_KEY": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

After you get the credentails, you should disable the secret by `disableSecret` context.

```sh
# Delete the secrets in Secrets Manager.
cdk --app "$CDK_IAM_USER" deploy --context disableSecret=1

# After disabled, you cannot get the secerts.
deno run -A https://raw.githubusercontent.com/jlandowner/deno-cdk-iam-creds/main/mod.ts
```

Also, you can create the secret again by just deploying again.

```sh
# Create the secret again
cdk --app "$CDK_IAM_USER" deploy
```

To clean up the user, just destroy the cdk app.

```sh
# Cleen up
cdk --app "$CDK_IAM_USER" destroy 
```

### Use with your app

You can use your own app. Here's an example.

```ts
import cdk from "npm:aws-cdk-lib";
import { cdkIAMCredentialSecret } from "https://raw.githubusercontent.com/jlandowner/deno-cdk-iam-creds/main/mod.ts";

class IAMUserStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // create IAM User
    const user = new cdk.aws_iam.User(this, "User");

    // You can create inline policies or attach managed policies to the user like this.
    const policy = new cdk.aws_iam.Policy(this, "Policy", {
      statements: [
        new cdk.aws_iam.PolicyStatement({
          actions: ["dynamodb:*"],
          resources: ["arn:aws:dynamodb:*:*:table/MyTable"],
          effect: cdk.aws_iam.Effect.ALLOW,
        }),
      ],
    });
    policy.attachToUser(user);

    // generate the IAM User's access key in Secrets Manager.
    cdkIAMCredentialSecret(this, user);
  }
}

const app = new cdk.App();

new IAMUserStack(app, "IAMUserStack", {
  stackName: app.node.tryGetContext("stackName"),
  env: {
    account: Deno.env.get("CDK_DEFAULT_ACCOUNT"), 
    region: Deno.env.get("CDK_DEFAULT_REGION") 
  }
});

app.synth();
```

Save as `yourapp.ts`. Then, set env to use the app and deploy the cdk app.

```sh
# Configure example cdk app
CDK_IAM_USER='deno run -A yourapp.ts'

# Deploy your app
cdk --app "$CDK_IAM_USER" deploy

# ...
```

### Retreive the secret value in your Deno program

You can retrive the secret value not only JSON stdout but also in your program.

For example, save it as a Kubernetes Secret, Base64-encoded and environment variable formatted.

```ts
import { encodeBase64 } from "https://deno.land/std@0.215.0/encoding/base64.ts";
import { stringify } from "https://deno.land/std@0.215.0/yaml/mod.ts";
import { getIAMCredentialSecretByStack } from "https://raw.githubusercontent.com/jlandowner/deno-cdk-iam-creds/main/mod.ts";

const secret = await getIAMCredentialSecretByStack("IAMUserStack");

const b64AccessKey = encodeBase64(secret.AWS_ACCESS_KEY_ID);
const b64SecretAccessKey = encodeBase64(secret.AWS_SECRET_ACCESS_KEY);

const sec = stringify({
  apiVersion: "v1",
  kind: "Secret",
  metadata: {
    name: "aws-credentials-secret",
  },
  data: {
    AWS_ACCESS_KEY_ID: b64AccessKey,
    AWS_SECRET_ACCESS_KEY: b64SecretAccessKey,
  },
});

Deno.writeTextFileSync("secret.yaml", sec);
```