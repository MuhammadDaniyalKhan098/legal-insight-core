# ==========================================
# FYP Deployment: Terraform Variables Definition
# ==========================================

variable "aws_region" {
  description = "The AWS region to deploy into"
  type        = string
}

variable "ami_id" {
  description = "The Amazon Machine Image ID for the EC2 instance"
  type        = string
}

variable "instance_type" {
  description = "The size of the EC2 instance"
  type        = string
  default     = "t3.medium" # Default size for Legal Insight
}

variable "key_pair_name" {
  description = "The name of the SSH key pair created in AWS"
  type        = string
}