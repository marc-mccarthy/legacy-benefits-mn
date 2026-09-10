terraform {
  required_version = "~> 1.16"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 6.63" }
  }
}

/**
 * Route 53 hosted zone plus every record that has to survive a DNS migration.
 *
 * The order of operations matters more than the code here: create the zone,
 * recreate every existing record, verify it resolves against the new
 * nameservers directly, and only then repoint the registrar. Switching
 * nameservers before the records exist takes the client's email down.
 *
 * Terraform cannot perform that last step — the registrar (Google, Squarespace)
 * has no provider. `terraform output nameservers` prints what to paste in.
 */

resource "aws_route53_zone" "this" {
  name    = var.domain_name
  comment = "Managed by Terraform"

  # The hosted zone was the one teardown blocker not covered by the switch that
  # governs the bucket, the registry, the ALB and the database. Any record added
  # outside Terraform — a registrar automation hook, a third-party verification
  # TXT, a Workspace re-verification — makes destroy fail with HostedZoneNotEmpty,
  # in the module holding the client's live mail records.
  force_destroy = !var.deletion_protection
}

# Arbitrary records carried over from the previous DNS host. Everything the
# domain currently answers for — email, verification, subdomains — belongs
# here before the nameserver switch.
resource "aws_route53_record" "carried_over" {
  # Apex and www A/AAAA records are excluded on purpose: the edge module owns
  # those, pointing them at CloudFront. Carrying the old host's A record over
  # would collide and, if it won, would keep serving the old site.
  for_each = {
    for r in var.records :
    "${r.type}:${r.name == "" ? "@" : r.name}" => r
    if !(contains(["A", "AAAA"], r.type) && contains(["", "www"], r.name))
  }

  zone_id = aws_route53_zone.this.zone_id
  name    = each.value.name == "" ? var.domain_name : "${each.value.name}.${var.domain_name}"
  type    = each.value.type
  ttl     = each.value.ttl
  records = each.value.records
}

# Google Workspace mail. Convenience only — always diff this against what the
# domain actually answers today rather than trusting the preset, because a
# wrong MX record means silently lost mail.
resource "aws_route53_record" "google_mx" {
  count = var.google_workspace_mx ? 1 : 0

  zone_id = aws_route53_zone.this.zone_id
  name    = var.domain_name
  type    = "MX"
  ttl     = 3600
  records = var.google_workspace_mx_legacy ? [
    "1 ASPMX.L.GOOGLE.COM",
    "5 ALT1.ASPMX.L.GOOGLE.COM",
    "5 ALT2.ASPMX.L.GOOGLE.COM",
    "10 ALT3.ASPMX.L.GOOGLE.COM",
    "10 ALT4.ASPMX.L.GOOGLE.COM",
  ] : ["1 SMTP.GOOGLE.COM"]
}

# SPF. Merged into one record on purpose: a domain may only publish a single
# SPF TXT record, and having two is itself a delivery failure.
resource "aws_route53_record" "spf" {
  count = var.spf_record == "" ? 0 : 1

  zone_id = aws_route53_zone.this.zone_id
  name    = var.domain_name
  type    = "TXT"
  ttl     = 3600
  records = [var.spf_record]
}

# DKIM public keys exceed the 255-character limit on a single TXT string, so
# they must be stored as several quoted strings inside one record. Splitting by
# hand is easy to get wrong and fails in ways that are hard to spot — a
# malformed key does not bounce mail, it just quietly stops authenticating it.
# So the full value goes in and the chunking happens here.
locals {
  dkim_chunked = {
    for selector, value in var.dkim_records :
    selector => join(" ", [
      for i in range(ceil(length(value) / 255)) :
      format("\"%s\"", substr(value, i * 255, min(255, length(value) - i * 255)))
    ])
  }
}

resource "aws_route53_record" "dkim" {
  for_each = var.dkim_records

  zone_id = aws_route53_zone.this.zone_id
  name    = "${each.key}._domainkey.${var.domain_name}"
  type    = "TXT"
  ttl     = 3600
  records = [local.dkim_chunked[each.key]]
}

resource "aws_route53_record" "dmarc" {
  count = var.dmarc_record == "" ? 0 : 1

  zone_id = aws_route53_zone.this.zone_id
  name    = "_dmarc.${var.domain_name}"
  type    = "TXT"
  ttl     = 3600
  records = [var.dmarc_record]
}
