import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * Single source of truth for district → geofence zone resolution.
 * Injected into EmployeesService and EmployeeTransfersService so every
 * path that sets an employee's department also keeps their zone in sync.
 */
@Injectable()
export class GeofenceSyncService {
  private readonly logger = new Logger(GeofenceSyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Strips punctuation/spaces so "R.Y. Khan", "r y khan", "RY Khan" all → "rykhan"
  private key(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  // Explicit district → zone map. Covers all 38 active PFA zones plus common
  // spelling/abbreviation variants stored in the department field.
  static readonly DEPT_ZONE: Readonly<Record<string, string>> = {
    attock:               'fedf9681-5548-443e-b493-1efe38f00523',
    bahawalnagar:         'b369f420-056b-47b9-b8fd-19f1faf3d3ca',
    bahawalpur:           'a571654c-7333-4b74-a58f-3b54e30a2e5d',
    bhakkar:              'd77267fe-6524-4e37-b7e9-76aab4a75fd3',
    chakwal:              'e6496f7a-2622-459d-93a5-a10f0b0d2fed',
    chiniot:              'ab294ebc-0f64-40c7-8d56-8b80809ab8a4',
    // DG Khan stored multiple ways in DB
    dgkhan:               'ea29d74d-58f5-43ac-bdfe-7292502d3bd8',
    deraghazkhan:         'ea29d74d-58f5-43ac-bdfe-7292502d3bd8',
    deraghazikhan:        'ea29d74d-58f5-43ac-bdfe-7292502d3bd8',
    // Lahore / disposal ops share the same 44B zone
    lahore:               '8c7b4fb5-353b-4d2b-bf6d-c0dd02911f20',
    disposalofadgops:     '8c7b4fb5-353b-4d2b-bf6d-c0dd02911f20',
    faisalabad:           '6723cf52-994c-4563-ad75-a1b26f02c80c',
    gujranwala:           'ff710e79-e1d4-4eab-9710-237231a510d3',
    gujrat:               '377fc39a-1446-4262-aea2-9da64f234549',
    hafizabad:            '5fe1727c-d3b2-4694-9ccf-8f7d99593c74',
    jhang:                '4887a666-739b-49d8-ac74-d03e85b053c7',
    // Jhelum/Jehlum: DB uses "Jehlum", zone table uses "Jhelum"
    jehlum:               '48b25cdc-f20c-4ac8-85e4-74978bfa9274',
    jhelum:               '48b25cdc-f20c-4ac8-85e4-74978bfa9274',
    kasur:                'a90e0d31-34ac-4126-a146-8fb2ad2facc9',
    khanewal:             '143cbc19-db16-4f35-977a-5e5aa5673a8b',
    khushab:              '745e9b97-c14e-4425-bd46-4c0a7a45281d',
    layyah:               '7b4ad0f8-c897-4812-a6d2-884018e6f727',
    lodhran:              '2546915e-ef9e-49ce-beed-7e49c5238d93',
    // M.B.Din stored multiple ways
    mbdin:                '0a8b7b56-c3ae-4fdf-9986-b5d69f6e6b18',
    mbdinmiandinburgh:    '0a8b7b56-c3ae-4fdf-9986-b5d69f6e6b18',
    mianwali:             '6f253929-8858-4231-879f-5e3b2673aecc',
    multan:               '2733f812-7ce0-4733-b130-90c422a52de1',
    murree:               '9252d658-a734-4673-b366-a44a48c6b2ae',
    muzaffargarh:         '61aa0435-b754-4d13-af24-ec8963b876a9',
    // Nankana stored with and without "Sahib"
    nankana:              'c22d2184-c332-4149-b378-dbcea27e48ef',
    nankanasahib:         'c22d2184-c332-4149-b378-dbcea27e48ef',
    narowal:              '281e8e66-a60e-48bd-9238-11b60d1da932',
    okara:                'a23034fd-8c0a-4695-8fa2-f0408b132a2c',
    pakpattan:            'c8722ed3-a8e5-4ea7-af2f-5942c7c236bb',
    // R.Y. Khan: key() strips punctuation → "rykhan"
    rykhan:               'bbe53ecb-966c-42ce-8bdc-656d32c47ec5',
    rahimyarkhan:         'bbe53ecb-966c-42ce-8bdc-656d32c47ec5',
    rajanpur:             'e8cb2637-712e-48e4-9ccd-3f25624ee545',
    rawalpindi:           'e6d04ebc-2381-4ed5-b181-a3a7e3bbe3fc',
    sahiwal:              '1f160d0a-e758-4376-8426-673eed6c21bd',
    sargodha:             '1f4e3165-9662-4863-a06f-dcee947a45f2',
    sheikhupura:          'e4ab7376-cc96-4c94-899c-3b47123bd854',
    sialkot:              'f478c318-307f-4249-a858-cd0bdea3003e',
    // T.T.Singh stored multiple ways
    ttsingh:              '9e8df0e3-7ecd-4927-93b2-2b6872393e60',
    tobiatekcsingh:       '9e8df0e3-7ecd-4927-93b2-2b6872393e60',
    vehari:               '2403376b-d813-46b2-afcb-4554063fbad9',
  };

  /**
   * Resolves the correct zone UUID for a given department/district string.
   * Fast path: static map. Fallback: fuzzy match against live zone names
   * so newly added zones are picked up automatically.
   */
  async resolveZoneForDepartment(department: string): Promise<string | null> {
    const k = this.key(department);
    const mapped = GeofenceSyncService.DEPT_ZONE[k];
    if (mapped) return mapped;

    // Fuzzy fallback — strips "Punjab Food Authority" prefix from zone names
    const zones = await this.prisma.geofenceZone.findMany({
      where: { active: true },
      select: { id: true, name: true },
    });
    for (const z of zones) {
      const zk = this.key(z.name).replace(/punjabfoodauthority/g, '');
      if (zk.includes(k) || k.includes(zk)) {
        return z.id;
      }
    }

    this.logger.warn(`No zone found for department: "${department}" (normalised: "${k}")`);
    return null;
  }

  /**
   * Assigns the correct geofence zone to an employee based on their department.
   * Returns true if the zone was set, false if no matching zone could be found.
   */
  async syncZoneForEmployee(employeeId: string, department: string): Promise<boolean> {
    const zoneId = await this.resolveZoneForDepartment(department);
    if (!zoneId) return false;

    await this.prisma.employee.update({
      where: { id: employeeId },
      data: { geofenceZoneIds: [zoneId] },
    });
    return true;
  }

  /**
   * Backfill: assigns zones to every active employee who has a department
   * set but no zone assigned. Safe to run multiple times — skips employees
   * who already have at least one zone.
   */
  async backfillMissingZones(): Promise<{ fixed: number; skipped: number; unresolved: string[] }> {
    const employees = await this.prisma.employee.findMany({
      where: { deletedAt: null, active: true, department: { not: null } },
      select: { id: true, email: true, department: true, geofenceZoneIds: true },
    });

    let fixed = 0;
    let skipped = 0;
    const unresolved: string[] = [];

    for (const emp of employees) {
      const zones = (emp.geofenceZoneIds as unknown[]) ?? [];
      if (zones.length > 0) { skipped++; continue; }

      const synced = await this.syncZoneForEmployee(emp.id, emp.department!);
      if (synced) {
        fixed++;
      } else {
        unresolved.push(emp.email);
      }
    }

    this.logger.log(`Zone backfill: ${fixed} fixed, ${skipped} already had zone, ${unresolved.length} unresolved`);
    if (unresolved.length) {
      this.logger.warn(`Unresolved departments: ${unresolved.join(', ')}`);
    }

    return { fixed, skipped, unresolved };
  }
}
