#!/usr/bin/env ruby
require 'yaml'

ROOT = File.expand_path('..', __dir__)
FILES = [
  File.join(ROOT, 'k8s', 'pod-spec.yaml'),
  File.join(ROOT, 'k8s', 'rollout.yaml')
]

errors = []
count = 0

FILES.each do |file|
  unless File.exist?(file)
    errors << "missing file: #{file}"
    next
  end

  begin
    docs = YAML.load_stream(File.read(file))
  rescue StandardError => e
    errors << "yaml parse error in #{file}: #{e.message}"
    next
  end

  docs.each_with_index do |doc, idx|
    next if doc.nil?
    count += 1
    unless doc.is_a?(Hash)
      errors << "#{file} document #{idx + 1}: expected mapping"
      next
    end

    api_version = doc['apiVersion']
    kind = doc['kind']
    metadata = doc['metadata']
    name = metadata.is_a?(Hash) ? metadata['name'] : nil

    errors << "#{file} document #{idx + 1}: missing apiVersion" if api_version.to_s.strip.empty?
    errors << "#{file} document #{idx + 1}: missing kind" if kind.to_s.strip.empty?
    errors << "#{file} document #{idx + 1}: missing metadata.name" if name.to_s.strip.empty?

    if kind == 'Rollout'
      steps = doc.dig('spec', 'strategy', 'canary', 'steps')
      unless steps.is_a?(Array) && !steps.empty?
        errors << "#{file} Rollout: missing spec.strategy.canary.steps"
      end
    end

    if kind == 'Pod'
      containers = doc.dig('spec', 'containers')
      unless containers.is_a?(Array) && !containers.empty?
        errors << "#{file} Pod: missing spec.containers"
      end
    end
  end
end

if errors.any?
  warn "[k8s-validate] FAIL (#{errors.size} issues)"
  errors.each { |e| warn "- #{e}" }
  exit 1
end

puts "[k8s-validate] PASS (#{count} YAML documents validated)"
