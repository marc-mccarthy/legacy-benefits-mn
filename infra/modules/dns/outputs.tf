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
