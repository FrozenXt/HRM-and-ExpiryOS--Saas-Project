const statutoryRuleRepository = require("../repositories/statutory-rule.repository");

class StatutoryRuleService {
  async getRules(searchHelper) {
    return await statutoryRuleRepository.findAll(searchHelper);
  }

  async getRuleById(id) {
    const rule = await statutoryRuleRepository.findById(id);
    if (!rule) throw new Error("Statutory rule not found");
    return rule;
  }

  // Guards against two open-ended active rules for the same country+type,
  // which would make it ambiguous which one payroll calc should use.
  async _assertNoOpenOverlap(
    country,
    type,
    isActive,
    effectiveTo,
    excludeId = null,
  ) {
    if (isActive === false || effectiveTo) return;
    const existing = await statutoryRuleRepository.findActiveOverlap(
      country,
      type,
      excludeId,
    );
    if (existing) {
      throw new Error(
        `An open-ended active rule already exists for ${country}/${type} — set its effectiveTo first, or mark this one inactive`,
      );
    }
  }

  async createRule(data) {
    await this._assertNoOpenOverlap(
      data.country,
      data.type,
      data.isActive ?? true,
      data.effectiveTo,
    );
    return await statutoryRuleRepository.create(data);
  }

  async updateRule(id, data) {
    const current = await statutoryRuleRepository.findById(id);
    if (!current) throw new Error("Statutory rule not found");

    const country = data.country ?? current.country;
    const type = data.type ?? current.type;
    const isActive = data.isActive ?? current.isActive;
    const effectiveTo =
      data.effectiveTo !== undefined ? data.effectiveTo : current.effectiveTo;

    await this._assertNoOpenOverlap(country, type, isActive, effectiveTo, id);

    const rule = await statutoryRuleRepository.update(id, data);
    if (!rule) throw new Error("Statutory rule not found");
    return rule;
  }

  async deleteRule(id) {
    const rule = await statutoryRuleRepository.delete(id);
    if (!rule) throw new Error("Statutory rule not found");
    return rule;
  }
}

module.exports = new StatutoryRuleService();
