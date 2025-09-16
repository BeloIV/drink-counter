from django.contrib import admin
from django.utils import timezone
from django.db.models import Sum
from .models import Person, Category, Item, Session, Transaction, ResetEvent, CoffeePreset

@admin.action(description="Aktivovať označené osoby")
def activate_people(modeladmin, request, queryset):
    queryset.update(active=True)

@admin.action(description="Deaktivovať označené osoby")
def deactivate_people(modeladmin, request, queryset):
    queryset.update(active=False)

@admin.register(Person)
class PersonAdmin(admin.ModelAdmin):
    list_display = ("name", "is_guest", "active", "created_at")
    list_filter = ("is_guest", "active")
    search_fields = ("name",)
    actions = (activate_people, deactivate_people)

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)

@admin.action(description="Aktivovať položky")
def activate_items(modeladmin, request, queryset):
    queryset.update(active=True)

@admin.action(description="Deaktivovať položky")
def deactivate_items(modeladmin, request, queryset):
    queryset.update(active=False)

@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "pricing_mode", "price", "active", "created_at")
    list_filter = ("category", "pricing_mode", "active")
    search_fields = ("name",)
    list_editable = ("pricing_mode", "price", "active")
    actions = (activate_items, deactivate_items)

class TransactionInline(admin.TabularInline):
    model = Transaction
    fields = ("person", "item", "price_at_time", "created_at")
    readonly_fields = ("person", "item", "price_at_time", "created_at")
    extra = 0
    can_delete = False
    show_change_link = True

@admin.action(description="Ukončiť označené session teraz")
def close_sessions(modeladmin, request, queryset):
    queryset.filter(ended_at__isnull=True).update(ended_at=timezone.now())

@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ("id", "started_at", "ended_at", "total_eur")
    inlines = (TransactionInline,)
    actions = (close_sessions,)

    def total_eur(self, obj):
        agg = obj.transactions.aggregate(s=Sum("price_at_time"))
        return agg["s"] or 0
    total_eur.short_description = "Súčet €"

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ("created_at", "person", "item", "session", "price_at_time")
    list_filter = ("item__category", "person__is_guest")
    search_fields = ("person__name", "item__name")

@admin.register(ResetEvent)
class ResetEventAdmin(admin.ModelAdmin):
    list_display = ("session", "created_at")


@admin.register(CoffeePreset)
class CoffeePresetAdmin(admin.ModelAdmin):
    list_display = ("label", "g_min", "g_max", "extra_eur", "created_at")
    search_fields = ("label", "note")
    list_editable = ("g_min", "g_max", "extra_eur")
    ordering = ("g_min", "id")