import { useCallback, useRef, useState } from 'react'
import { DEFAULT_CUSTOM_QUANTITY } from './orderRules'

/** Which step the order is on and what has been picked so far. Steps: person, category, item, grams, done. */
export function useOrderFlow(categories) {
  const [step, setStep] = useState('person')
  const [isGroupOrder, setIsGroupOrder] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState(null)
  const [selectedPersons, setSelectedPersons] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)
  const [customQuantity, setCustomQuantity] = useState('')

  const pickCategory = (category) => {
    setSelectedCategory(category)
    setSelectedItem(null)
    setStep('item')
  }

  // With a single category there is nothing to choose, so skip straight to its items.
  const goToCategories = () => (categories.length === 1 ? pickCategory(categories[0]) : setStep('category'))

  // PersonCard is memoised, so selectPerson has to stay stable and read fresh values from refs.
  const isGroupOrderRef = useRef(isGroupOrder)
  isGroupOrderRef.current = isGroupOrder
  const goToCategoriesRef = useRef(goToCategories)
  goToCategoriesRef.current = goToCategories

  const selectPerson = useCallback((person) => {
    if (!isGroupOrderRef.current) {
      setSelectedPerson(person)
      goToCategoriesRef.current()
      return
    }
    setSelectedPersons((selected) =>
      selected.some((other) => other.id === person.id)
        ? selected.filter((other) => other.id !== person.id)
        : [...selected, person],
    )
  }, [])

  const toggleGroupOrder = useCallback(() => {
    setIsGroupOrder((isGroup) => !isGroup)
    setSelectedPersons([])
    setSelectedPerson(null)
  }, [])

  const continueWithGroup = () => {
    if (selectedPersons.length > 0) goToCategories()
  }

  const openQuantityStep = (item) => {
    setSelectedItem(item)
    setCustomQuantity(DEFAULT_CUSTOM_QUANTITY[item.pricing_mode])
    setStep('grams')
  }

  const reset = () => {
    setStep('person')
    setSelectedPerson(null)
    setSelectedPersons([])
    setSelectedCategory(null)
    setSelectedItem(null)
  }

  return {
    step,
    setStep,
    isGroupOrder,
    selectedPerson,
    selectedPersons,
    selectedCategory,
    selectedItem,
    customQuantity,
    setCustomQuantity,
    groupSize: isGroupOrder ? selectedPersons.length : 1,
    selectPerson,
    toggleGroupOrder,
    continueWithGroup,
    pickCategory,
    openQuantityStep,
    reset,
  }
}
