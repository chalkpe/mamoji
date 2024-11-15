import { useForm } from 'react-hook-form'
import { Button } from '~/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel } from '~/components/ui/form'
import { Input } from '~/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'

export default function Test() {
  const form = useForm()
  return (
    <div className="flex flex-col gap-4">
      <Form {...form}>
        <FormField
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter your name" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gender</FormLabel>
              <FormControl>
                <Select {...field}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Female" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="hotbread">Hot Bread</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          name="birthday"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Birthday</FormLabel>
              <FormControl>
                <div className="flex flex-row gap-2">
                  <Select {...field}>
                    <SelectTrigger className="w-[80px]">
                      <SelectValue placeholder="17" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...Array(31)].map((_, index) => (
                        <SelectItem key={index} value={`${index + 1}`}>
                          {index + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select {...field}>
                    <SelectTrigger className="w-[110px]">
                      <SelectValue placeholder="January" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        'January',
                        'February',
                        'March',
                        'April',
                        'May',
                        'June',
                        'July',
                        'August',
                        'September',
                        'October',
                        'November',
                        'December',
                      ].map((month) => (
                        <SelectItem key={month} value={month}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select {...field}>
                    <SelectTrigger className="w-[90px]">
                      <SelectValue placeholder="2013" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...Array(50)].map((_, index) => (
                        <SelectItem key={index} value={`${2013 - index}`}>
                          {2013 - index}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          name="Email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="Enter your email" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit">Submit</Button>
      </Form>
    </div>
  )
}

export const handle = {
  breadcrumb: '뜨빵',
}
