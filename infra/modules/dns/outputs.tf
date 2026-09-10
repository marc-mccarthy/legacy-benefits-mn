output "zone_id" {
  value = aws_route53_zone.this.zone_id
}

output "nameservers" {
  description = "Paste these into the registrar to complete the migration. Do this only after verifying the records resolve against them."
  value       = aws_route53_zone.this.name_servers
}

output "verify_command" {
  description = "Check the new zone answers correctly before switching nameservers"
  value       = "dig @${aws_route53_zone.this.name_servers[0]} ${var.domain_name} MX +short"
}

# The runbook lives here, next to the nameservers, because this is what someone
# reads at the moment they are about to change them. A README they opened last
# week is not in front of them; `terraform output route53_nameservers` is.
output "cutover_runbook" {
  description = "Ordered steps for the nameserver switch. Read this before touching the registrar."
  value       = <<-EOT
    Cutover runbook — ${var.domain_name}

    Terraform has created the zone. Nothing is live yet: the registrar still
    points at the old nameservers, so mail keeps flowing untouched.

    DNSSEC FIRST. If the registrar publishes a DS record, switching nameservers
    while it is still there takes the whole domain down. This zone is unsigned,
    so validating resolvers would ask for signatures that do not exist and
    return SERVFAIL — an outage, not a degradation, and the DS TTL at the
    registry is typically 24 hours before it can be undone.

      1. Disable DNSSEC at the registrar. Safe to do early; nothing breaks, and
         it starts the TTL clock.

      2. Confirm the DS is gone at the TLD servers rather than a recursive
         resolver, so a cached negative cannot give a false pass:

           dig DS ${var.domain_name} @$(dig +short NS com. | head -1)

         Must return nothing. If it still returns a record, STOP and wait.

      3. Verify this zone answers correctly at its own nameservers, before
         anything delegates to it:

           bash infra/scripts/preflight-cutover.sh ${var.domain_name}

         If MX is wrong or missing, STOP — switching now bounces mail.

      4. Only once steps 2 and 3 both pass, point the registrar at:

    ${join("\n", [for ns in aws_route53_zone.this.name_servers : "           ${ns}"])}

      5. Wait for propagation — the parent delegation TTL, up to 48 hours.
         Confirm mail still delivers and any verification records still
         resolve.

      6. Set use_domain = true and apply again. ACM validates by reading a
         record over public DNS, so the certificate can only be issued once
         the delegation above is live.
  EOT
}
