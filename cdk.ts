import cdk from "npm:aws-cdk-lib";
import { cdkIAMCredentialSecret } from "./mod.ts";

class IAMUserStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // create IAM User
    const user = new cdk.aws_iam.User(this, "User");

    // TODO: You can create inline policies or attach managed policies to the user like this.
    // const policy = new cdk.aws_iam.Policy(this, "Policy", {
    //   statements: [
    //     new cdk.aws_iam.PolicyStatement({
    //       actions: ["dynamodb:*"],
    //       resources: ["arn:aws:dynamodb:*:*:table/MyTable"],
    //       effect: cdk.aws_iam.Effect.ALLOW,
    //     }),
    //   ],
    // });
    // policy.attachToUser(user);

    // generate the IAM User's access key in Secrets Manager.
    // Once you retrieved the secret object, you can disable secret generation by setting the CDK context key "disableSecret" to 1.
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