import { Icon } from '../../components/Icon'
import { StepNavigation, StepSection } from './StepSection'

export function CategoryStep({ title, categories, onPick, onBack }) {
  return (
    <StepSection title={title}>
      <div className="grid-choices">
        {categories.map((category) => (
          <button key={category.key} className={`choice ${category.className}`} onClick={() => onPick(category)}>
            <Icon name={category.icon} size={40} />
            <div>{category.label}</div>
          </button>
        ))}
      </div>
      <StepNavigation onBack={onBack} />
    </StepSection>
  )
}
