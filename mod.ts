import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "npm:@aws-sdk/client-secrets-manager";
import {
  CloudFormationClient,
  DescribeStacksCommand,
} from "npm:@aws-sdk/client-cloudformation";
import cdk from "npm:aws-cdk-lib";
import { Construct } from "npm:constructs";

// CFN_OUTPUT_IAM_CREDENTIAL_SECRET_NAME is a name of cloudformation output key of the generated secret name
export const CFN_OUTPUT_IAM_CREDENTIAL_SECRET_NAME = "IAMCredentialSecretName";

// CDK_CONTEXT_DISABLE_SECRET is a context key to disable secret generation.
export const CDK_CONTEXT_DISABLE_SECRET = "disableSecret";

// IAMCredentialSecret is a secret object that contains AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.
export interface IAMCredentialSecret {
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
}

// ReservedSecretPropsKeys is a list of reserved secret props keys.
type ReservedSecretPropsKeys =
  | "generateSecretString"
  | "secretObjectValue"
  | "secretStringValue"
  | "secretStringBeta1";

// cdkIAMCredentialSecretProps is a props of cdkIAMCredentialSecret.
export interface cdkIAMCredentialSecretProps {
  secretProps?: Omit<
    cdk.aws_secretsmanager.SecretProps,
    ReservedSecretPropsKeys
  >;
  cfnOutputProps?: Omit<cdk.CfnOutputProps, "value">;
}

// cdkIAMCredentialSecret is a CDK construct to generate a given IAM User's access key and save it in AWS Secrets Manager.
// This function can be called in your CDK Stack constructer and returns a cdk.aws_secretsmanager.Secret object.
// Once you retrieved the secret object, you can disable secret generation by setting the CDK context key "disableSecret" to 1.
export function cdkIAMCredentialSecret(
  scope: Construct,
  user: cdk.aws_iam.User,
  props: cdkIAMCredentialSecretProps = {},
) {
  const accessKey = new cdk.aws_iam.AccessKey(scope, "AccessKey", { user });

  if (!disableSecretContext(scope)) {
    const secret = new cdk.aws_secretsmanager.Secret(scope, "Secret", {
      ...props.secretProps,
      secretObjectValue: {
        AWS_ACCESS_KEY_ID: cdk.SecretValue.unsafePlainText(
          accessKey.accessKeyId,
        ),
        AWS_SECRET_ACCESS_KEY: accessKey.secretAccessKey,
      },
    });
    new cdk.CfnOutput(scope, CFN_OUTPUT_IAM_CREDENTIAL_SECRET_NAME, {
      ...props.cfnOutputProps,
      value: secret.secretName,
    });
    return secret;
  }
}

function disableSecretContext(scope: Construct) {
  return Number(scope.node.tryGetContext(CDK_CONTEXT_DISABLE_SECRET)) === 1;
}

// getIAMCredentialSecretByStack is a function to retreive the generated secret value by stack name
export async function getIAMCredentialSecretByStack(stackName: string) {
  const client = new CloudFormationClient();
  const res = await client.send(
    new DescribeStacksCommand({ StackName: stackName }),
  );

  for (const stack of res.Stacks || []) {
    for (const output of stack.Outputs || []) {
      if (output.OutputKey === CFN_OUTPUT_IAM_CREDENTIAL_SECRET_NAME) {
        return getIAMCredentialSecretByName(output.OutputValue || "");
      }
    }
  }
  throw new Error(`Failed to find a secret in stack "${stackName}"`);
}

// getIAMCredentialSecretByName is a function to retreive the generated secret value by secret name
export async function getIAMCredentialSecretByName(
  secretName: string,
): Promise<IAMCredentialSecret> {
  const client = new SecretsManagerClient();
  const response = await client.send(
    new GetSecretValueCommand({
      SecretId: secretName,
    }),
  );
  return JSON.parse(response.SecretString || "");
}

if (import.meta.main) console.log(JSON.stringify(await getIAMCredentialSecretByStack(Deno.args[0] || "IAMUserStack"), null, "  "))
