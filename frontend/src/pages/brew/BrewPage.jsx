import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api'
import { FlashAlert } from '../../components/FlashAlert'
import { Icon } from '../../components/Icon'
import { PageHeader } from '../../components/PageHeader'
import { useFlashMessage } from '../../hooks/useFlashMessage'
import { CATEGORY, findCategory, isBrewableCoffee } from '../../lib/categories'
import { errorMessage } from '../../lib/errors'
import { brewPricePerMl, coldBrewIdentity, findColdBrew, isPriceOutdated } from './brewRules'
import { CoffeeChipList } from './CoffeeChip'
import { CoffeePickStep } from './CoffeePickStep'
import { GramsStep } from './GramsStep'
import { RecapStep } from './RecapStep'
import { useBrewData } from './useBrewData'
import { useBrewRecipe } from './useBrewRecipe'

const FLASH_DURATION_MS = 3000

function BrewDoneStep({ result, onBrewAnother, onHome }) {
  return (
    <div className="step-zoom-in">
      <div className="card p-4 text-center">
        <div className="done-check"><Icon name="check" size={48} /></div>
        <h2 className="mt-2 mb-3 fs-lg">Cold brew je navarený</h2>
        <CoffeeChipList coffees={result.coffees} className="mb-3" />
        <div className="d-flex align-items-center justify-content-center gap-2 text-muted">
          <Icon name="coldBrew" size={16} />
          {result.outputName}
          <span className="num">{result.outputMl} ml</span>
        </div>
      </div>
      <div className="d-flex gap-2 mt-3">
        <button className="btn btn-primary flex-fill d-flex align-items-center justify-content-center gap-2" onClick={onBrewAnother}>
          <Icon name="coldBrew" size={16} /> Vyrobiť ďalší
        </button>
        <button className="btn btn-outline-secondary flex-fill" onClick={onHome}>Domov</button>
      </div>
    </div>
  )
}

/** Guided cold brew production: pick coffees and grams, check the price, then brew. */
export default function BrewPage() {
  const navigate = useNavigate()
  const data = useBrewData()
  const flash = useFlashMessage(FLASH_DURATION_MS)
  const recipe = useBrewRecipe()
  const [step, setStep] = useState('pick-coffee')
  const [isBrewing, setIsBrewing] = useState(false)
  const [result, setResult] = useState(null)

  const identity = coldBrewIdentity(recipe.coffees)
  const price = brewPricePerMl(recipe.coffees, recipe.outputMl, data.coffeeFilters)
  const existingItem = findColdBrew(data.items, identity.name)
  const priceOutdated = isPriceOutdated(existingItem, price)

  const pickCoffee = (item) => {
    recipe.selectCoffee(item)
    setStep('pick-grams')
  }

  const confirmGrams = (grams) => {
    if (recipe.addSelectedCoffee(grams)) setStep('recap')
  }

  const backToCoffees = () => {
    recipe.clearSelection()
    setStep('pick-coffee')
  }

  const startOver = () => {
    recipe.reset()
    setStep('pick-coffee')
  }

  const resolveOutputItem = async (category) => {
    if (!existingItem) {
      return api.addItem({
        name: identity.name,
        category_id: category.id,
        pricing_mode: 'per_ml',
        price: String(price),
        color: identity.color,
      })
    }
    if (priceOutdated && recipe.updatePrice) await api.updateItem(existingItem.id, { price: String(price) })
    return existingItem
  }

  const brew = async () => {
    const category = findCategory(data.categories, CATEGORY.COLD_BREW)
    if (!category) {
      flash.show('Kategória „Cold Brew" neexistuje. Vytvor ju v Admine.')
      return
    }
    setIsBrewing(true)
    try {
      await api.csrf().catch(() => {})
      const outputItem = await resolveOutputItem(category)
      await api.createBrewBatch({
        ingredients: recipe.coffees.map((coffee) => ({ coffee_id: coffee.item.id, grams: coffee.grams })),
        output_item_id: outputItem.id,
        output_ml: recipe.outputMl,
      })
      setResult({ outputName: outputItem.name, outputMl: recipe.outputMl, coffees: recipe.coffees })
      setStep('done')
    } catch (error) {
      flash.show(errorMessage(error))
    } finally {
      setIsBrewing(false)
    }
  }

  return (
    <div className="container py-3">
      <PageHeader title="Cold Brew" icon="coldBrew" />
      <FlashAlert flash={flash} tone="warning" />

      {step === 'pick-coffee' && (
        <CoffeePickStep
          availableCoffees={data.items.filter((item) => isBrewableCoffee(item) && item.active)}
          recipeCoffees={recipe.coffees}
          isLoading={data.isLoading}
          onPick={pickCoffee}
          onRemove={recipe.removeCoffee}
        />
      )}

      {step === 'pick-grams' && recipe.selectedCoffee && (
        <GramsStep coffee={recipe.selectedCoffee} onConfirm={confirmGrams} onBack={backToCoffees} />
      )}

      {step === 'recap' && (
        <RecapStep
          recipe={recipe}
          identity={identity}
          price={price}
          existingItem={existingItem}
          isPriceOutdated={priceOutdated}
          isBrewing={isBrewing}
          onBrew={brew}
          onAddCoffee={() => setStep('pick-coffee')}
          onStartOver={startOver}
        />
      )}

      {step === 'done' && result && (
        <BrewDoneStep result={result} onBrewAnother={startOver} onHome={() => navigate('/')} />
      )}
    </div>
  )
}
